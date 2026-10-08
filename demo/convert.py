#!/usr/bin/env python3
"""Convert rustpress's docs (VitePress's markdown dialect) into a Zola site
for vpkit-zola: this demo (README.md). Fails loudly on anything it does not
know. Python 3 with PyYAML.

  python3 demo/convert.py ../rustpress/docs demo
"""
import pathlib
import re
import shutil
import subprocess
import sys
import tomllib

import yaml

SRC = pathlib.Path(sys.argv[1]).resolve()
OUT = pathlib.Path(sys.argv[2]).resolve()
CONTENT = SRC / 'content'
# rustpress's own galleries (its 218 color themes, its highlighting), with
# its scripts: not docs a Zola theme renders
SKIP = {'themes.md', 'syntax-highlight.md'}
CONTAINERS = {'tip', 'info', 'warning', 'danger', 'details', 'note', 'important', 'caution'}
ALERTS = {'note', 'tip', 'important', 'warning', 'caution'}
REPO_DOCS = 'https://github.com/at-least/rustpress/blob/main/docs/content/'


# ---- TOML out ----------------------------------------------------------------

def toml_value(v):
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, str):
        return '"' + v.replace('\\', '\\\\').replace('"', '\\"') + '"'
    if isinstance(v, list):
        return '[' + ', '.join(toml_value(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{ ' + ', '.join(f'{toml_key(k)} = {toml_value(x)}' for k, x in v.items()) + ' }'
    raise TypeError(f'no TOML for {v!r}')


def toml_key(k):
    return k if re.fullmatch(r'[A-Za-z0-9_-]+', k) else toml_value(k)


# ---- links -----------------------------------------------------------------------

def page_for(url_path):
    """the content file a VitePress link path names, or None"""
    p = url_path.strip('/')
    p = re.sub(r'\.(md|html)$', '', p)
    for cand in ([f'{p}.md', f'{p}/index.md'] if p else ['index.md']):
        if (CONTENT / cand).is_file():
            return cand
    return None


def zola_path(rel):
    """@/ path of a content file in the output"""
    return '@/' + ('_index.md' if rel == 'index.md' else re.sub(r'(^|/)index\.md$', r'\1_index.md', rel))


def convert_link(url, page_rel):
    if re.match(r'^[a-z]+:', url) or url.startswith('#'):
        return url
    path, _, anchor = url.partition('#')
    if not path.startswith('/'):
        base = pathlib.PurePosixPath('/' + page_rel).parent
        path = str(pathlib.PurePosixPath(base, path))
        # resolve . and ..
        parts = []
        for part in path.split('/'):
            if part == '..':
                parts.pop()
            elif part not in ('', '.'):
                parts.append(part)
        path = '/' + '/'.join(parts) + ('/' if url.split('#')[0].endswith('/') else '')
    target = page_for(path)
    if target is None:
        if (SRC / 'public' / path.lstrip('/')).is_file() or (SRC / 'static' / path.lstrip('/')).is_file():
            return url  # an asset, copied as it is
        raise SystemExit(f'{page_rel}: link to {url}: no such page')
    if target in SKIP:
        return REPO_DOCS + target
    return zola_path(target) + (f'#{anchor}' if anchor else '')


def convert_links(text, page_rel):
    # [text](url) and [text](url "title"); an image's source stays as it is
    def one(m):
        if m.group(1):
            return m.group(0)
        return f'{m.group(1)}[{m.group(2)}]({convert_link(m.group(3), page_rel)}{m.group(4)})'
    return re.sub(r'(!?)\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)', one, text)


# ---- inline: badges, code spans ----------------------------------------------

def outside_code_spans(line, fn):
    """apply fn to the parts of a line outside `code spans`"""
    out, i = [], 0
    for m in re.finditer(r'(`+)(.+?)\1', line):
        out.append(fn(line[i:m.start()]))
        out.append(m.group(0))
        i = m.end()
    out.append(fn(line[i:]))
    return ''.join(out)


def badge(m):
    attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group('attrs')))
    unknown = set(attrs) - {'type', 'text'}
    if unknown:
        raise SystemExit(f'badge attributes {unknown}')
    args = ''.join(f' {k}="{v}"' for k, v in attrs.items())
    if m.group('body') is not None:
        return '{% <vp_badge' + args + '> %}' + m.group('body') + '{% </vp_badge> %}'
    return '{{ <vp_badge' + args + ' /> }}'


BADGE = re.compile(r'<Badge(?P<attrs>(?:\s+\w+="[^"]*")*)\s*(?:/>|>(?P<body>.*?)</Badge>)')


def vitepress_slug(text):
    """VitePress's slugify (@mdit-vue/shared), for a heading's id"""
    s = text
    s = re.sub(r'[̀-ͯ]', '', s)
    s = re.sub(r'[\u0000-\u001f]', '', s)
    s = re.sub(r'[\s~`!@#$%^&*()\-_+=\[\]{}|\\;:"\'“”‘’<>,.?/]+', '-', s)
    s = re.sub(r'-{2,}', '-', s).strip('-')
    s = re.sub(r'^(\d)', r'_\1', s)
    return s.lower()


def convert_inline(line, page_rel):
    heading = re.match(r'^(#{1,6})\s', line)
    had_badge = bool(BADGE.search(re.sub(r'(`+)(.+?)\1', '', line)))
    line = outside_code_spans(line, lambda s: BADGE.sub(badge, s))
    if heading and had_badge and not re.search(r'\{#[\w-]+\}\s*$', line):
        # VitePress's id leaves the badge out; Zola's would not
        text = re.sub(r'\{\{ <vp_badge[^}]*/> \}\}|\{% <vp_badge.*?</vp_badge> %\}', '', line[len(heading.group(0)):])
        text = re.sub(r'`([^`]*)`', r'\1', text)
        line = line.rstrip() + ' {#' + vitepress_slug(text) + '}'
    return outside_code_spans(line, lambda s: convert_links(s, page_rel))


def needs_raw(text):
    return bool(re.search(r'\{\{|\{%|\{#', text))


# ---- fences ----------------------------------------------------------------------

FENCE = re.compile(r'^(\s*)(`{3,}|~{3,})(.*)$')
NOTATION = re.compile(r'\s*(?://|#|<!--|/\*)\s*\[!code ([^\]]+)\]\s*(?:-->|\*/)?\s*$')


def fence_info(info, in_group, page_rel):
    """VitePress's fence info as Zola's: lang, {lines} → hl_lines,
    :line-numbers[=n] → linenos[,linenostart], [title] → name in a code
    group (dropped elsewhere, as VitePress drops it)"""
    info = info.strip()
    title = None
    m = re.search(r'\s*\[([^\]]*)\]\s*$', info)
    if m:
        title, info = m.group(1), info[:m.start()]
    lines = None
    m = re.search(r'\s*\{([\d,\s-]+)\}\s*', info)
    if m:
        lines = m.group(1)
        info = info[:m.start()] + info[m.end():]
    numbers = None
    m = re.search(r':line-numbers(?:=(\d+))?', info)
    if m:
        numbers = m.group(1) or ''
        info = info[:m.start()] + info[m.end():]
    info = info.replace(':no-line-numbers', '').strip()
    if not re.fullmatch(r'[\w+#-]*', info):
        raise SystemExit(f'{page_rel}: fence info {info!r}')
    opts = [info] if info else []
    if numbers is not None:
        opts.append('linenos')
        if numbers:
            opts.append(f'linenostart={numbers}')
    if lines:
        opts.append('hl_lines=' + ' '.join(x.strip() for x in lines.split(',')))
    if in_group:
        if title is None:
            raise SystemExit(f'{page_rel}: a code block in a code group without a title')
        opts.append(f'name={title}')
    return ','.join(opts), lines


def convert_fence(lines, indent, marker, info, in_group, page_rel):
    """a fenced block (its lines without the fences) as Zola's"""
    lang = re.match(r'[\w+#-]*', info.strip()).group(0)
    zinfo, _ = fence_info(info, in_group, page_rel)
    body = list(lines)
    if lang not in ('md', 'markdown', ''):
        # Shiki's notations: highlight → hl_lines; the others have no Zola
        # equivalent and go
        marked = []
        for i, l in enumerate(body):
            m = NOTATION.search(l)
            if m:
                body[i] = l[:m.start()]
                if m.group(1).strip() == 'highlight':
                    marked.append(str(i + 1))
        if marked:
            zinfo = re.sub(r'(,hl_lines=[^,]*)', '', zinfo) + ',hl_lines=' + ' '.join(marked)
    block = [f'{indent}{marker}{zinfo}', *body, f'{indent}{marker}']
    if any(needs_raw(l) for l in block):
        block = ['{% raw %}', *block, '{% endraw %}']
    return block


# ---- snippets (<<<) -------------------------------------------------------------

def snippet(line, in_group, page_rel):
    m = re.match(r'^(\s*)<<<\s+@/(\S+?)(?:#(\w+))?(?:\{([^}]*)\})?(?:\s+\[([^\]]*)\])?\s*$', line)
    if not m:
        raise SystemExit(f'{page_rel}: snippet {line!r}')
    indent, path, region, opts, title = m.groups()
    file = SRC / path
    code = file.read_text().rstrip('\n').split('\n')
    if region:
        start = next(i for i, l in enumerate(code) if re.search(rf'#region {region}\b', l))
        end = next(i for i, l in enumerate(code) if re.search(rf'#endregion {region}\b', l))
        code = code[start + 1:end]
    code = [l for l in code if not re.search(r'#(end)?region\b', l)]
    lang = {'js': 'js', 'ts': 'ts', 'md': 'md', 'css': 'css'}[file.suffix[1:]]
    info = lang
    if opts:
        parts = opts.split()
        lines = [p for p in parts if re.fullmatch(r'[\d,-]+', p)]
        other = [p for p in parts if p not in lines]
        for o in other:
            o_lang, _, rest = o.partition(':')
            if o_lang:
                info = o_lang
            if rest:
                info += ':' + rest
        if lines:
            info += '{' + lines[0] + '}'
    if title:
        info += f' [{title}]'
    elif in_group:
        info += f' [{file.name}]'
    return convert_fence(code, indent, '```', info, in_group, page_rel)


# ---- a page ----------------------------------------------------------------------

def convert_body(text, page_rel, offset=0):
    """offset: the front matter's lines, for errors' line numbers"""
    out = []
    lines = text.split('\n')
    stack = []  # open containers: (colons, closing lines)
    in_group = False
    i = 0
    while i < len(lines):
        line = lines[i]
        m = FENCE.match(line)
        if m:
            indent, marker, info = m.groups()
            close = re.compile(r'^\s*' + re.escape(marker[0]) + '{' + str(len(marker)) + r',}\s*$')
            j = i + 1
            while not close.match(lines[j]):
                j += 1
            out += convert_fence(lines[i + 1:j], indent, marker, info, in_group, page_rel)
            i = j + 1
            continue
        m = re.match(r'^(\s*)(:{3,})\s*(.*?)\s*$', line)
        if m:
            indent, colons, rest = m.groups()
            if not rest:
                n, closing = stack.pop()
                if n != len(colons):
                    raise SystemExit(f'{page_rel}:{offset + i + 1}: ::: closes a {n}-colon container')
                out += closing
                if closing == ['{% </vp_code_group> %}']:
                    in_group = False
                i += 1
                continue
            name, _, title = rest.partition(' ')
            attrs = set(re.findall(r'\{([\w-]+)\}', title))
            title = re.sub(r'\s*\{[\w-]+\}', '', title).strip()
            if name == 'code-group':
                out.append('{% <vp_code_group> %}')
                stack.append((len(colons), ['{% </vp_code_group> %}']))
                in_group = True
            elif name == 'raw':
                out += [f'{indent}<div class="vp-raw">', '']
                stack.append((len(colons), ['', f'{indent}</div>']))
            elif name in CONTAINERS and indent:
                # inside a list: the component's own lines are not indented
                # and would end the list; an alert (a blockquote) nests
                if name not in ALERTS or title or attrs:
                    raise SystemExit(f'{page_rel}:{offset + i + 1}: an indented {name} container')
                j = i + 1
                body = []
                while not re.match(r'^\s*:{3,}\s*$', lines[j]):
                    body.append(lines[j])
                    j += 1
                out.append(f'{indent}> [!{name.upper()}]')
                out += [f'{indent}> {convert_inline(b[len(indent):], page_rel)}' for b in body]
                i = j + 1
                continue
            elif name in CONTAINERS:
                if attrs - {'open', 'no-title'}:
                    raise SystemExit(f'{page_rel}:{offset + i + 1}: container attributes {attrs}')
                args = f' type="{name}"'
                if title:
                    html = re.sub(r'`([^`]*)`', r'<code>\1</code>', title).replace('"', '&quot;')
                    args += f' title="{html}"'
                if 'open' in attrs:
                    args += ' open={true}'
                if 'no-title' in attrs:
                    args += ' no_title={true}'
                out.append('{% <vp_container' + args + '> %}')
                stack.append((len(colons), ['{% </vp_container> %}']))
            else:
                raise SystemExit(f'{page_rel}:{offset + i + 1}: container {name!r}')
            i += 1
            continue
        if re.match(r'^\s*<<<\s', line):
            out += snippet(line, in_group, page_rel)
            i += 1
            continue
        if line.strip() == '[[toc]]':
            i += 1
            continue
        if re.search(r'<!--\s*@include', re.sub(r'(`+)(.+?)\1', '', line)):
            raise SystemExit(f'{page_rel}:{offset + i + 1}: include')
        if re.match(r'^\s*<script\b', line):
            raise SystemExit(f'{page_rel}:{offset + i + 1}: script')
        line = convert_inline(line, page_rel)
        if needs_raw(re.sub(r'\{\{ <vp_badge.*?/> \}\}|\{% <vp_badge.*?</vp_badge> %\}', '', re.sub(r'\{#[\w-]+\}\s*$', '', line) if re.match(r'^#{1,6}\s', line) else line)):
            line = '{% raw %}' + line + '{% endraw %}'
        out.append(line)
        i += 1
    if stack:
        raise SystemExit(f'{page_rel}: unclosed containers {stack}')
    return '\n'.join(out)


def front_matter(fm, body, page_rel):
    """VitePress's YAML front matter as Zola's TOML: its own keys, the
    theme's under [extra]"""
    known = {'title', 'description', 'layout', 'hero', 'features', 'outline', 'sidebar'}
    unknown = set(fm) - known
    if unknown:
        raise SystemExit(f'{page_rel}: front matter {unknown}')
    title = fm.get('title')
    if title is None:
        h1 = re.search(r'^# (.+?)(?:\s*\{#[\w-]+\})?\s*$', body, re.M)
        title = re.sub(r'`([^`]*)`', r'\1', h1.group(1)) if h1 else fm.get('hero', {}).get('name')
    top = {'title': title}
    if 'description' in fm:
        top['description'] = fm['description']
    if page_rel == 'index.md':
        pass
    extra = {}
    if fm.get('layout') == 'home':
        extra['layout'] = 'home'
    elif 'layout' in fm:
        raise SystemExit(f'{page_rel}: layout {fm["layout"]}')
    for key in ('outline', 'sidebar'):
        if key in fm:
            extra[key] = fm[key]
    lines = ['+++']
    lines += [f'{k} = {toml_value(v)}' for k, v in top.items()]
    updated = subprocess.run(['git', '-C', str(SRC), 'log', '-1', '--format=%cI', '--', f'content/{page_rel}'],
                             capture_output=True, text=True, check=True).stdout.strip()
    if updated and not re.search(r'(^|/)index\.md$', page_rel):  # a section has no updated
        lines.append(f'updated = {updated}')
    if extra or 'hero' in fm or 'features' in fm:
        lines += ['', '[extra]']
        lines += [f'{k} = {toml_value(v)}' for k, v in extra.items()]
    if 'hero' in fm:
        hero = dict(fm['hero'])
        if 'actions' in hero:
            hero['actions'] = [{**a, 'link': convert_link(a['link'], page_rel)} for a in hero['actions']]
        lines += ['', '[extra.hero]']
        lines += [f'{k} = {toml_value(v)}' for k, v in hero.items()]
    for feature in fm.get('features', []):
        lines += ['', '[[extra.features]]']
        for k, v in feature.items():
            if k == 'linkText':
                k = 'link_text'
            if k == 'link':
                v = convert_link(v, page_rel)
            lines.append(f'{k} = {toml_value(v)}')
    lines.append('+++')
    return '\n'.join(lines)


def convert_page(path):
    rel = path.relative_to(CONTENT).as_posix()
    text = path.read_text()
    fm = {}
    m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    if m:
        fm = yaml.safe_load(m.group(1)) or {}
        text = text[m.end():]
    body = convert_body(text, rel, m.group(0).count('\n') if m else 0)
    out_rel = re.sub(r'(^|/)index\.md$', r'\1_index.md', rel)
    dest = OUT / 'content' / out_rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(front_matter(fm, text, rel) + '\n' + body.rstrip('\n') + '\n')
    return rel


# ---- the site ---------------------------------------------------------------------

def sidebar_items(items, base, page_rel='rustpress.toml'):
    out = []
    for item in items:
        b = item.get('base', base)
        if 'link' in item and (b + item['link']).lstrip('/') + '.md' in {f'{s}' for s in SKIP}:
            continue
        new = {}
        if 'text' in item:
            new['text'] = item['text']
        if 'collapsed' in item:
            new['collapsed'] = item['collapsed']
        if 'link' in item:
            new['link'] = convert_link(b + item['link'], page_rel)
        if 'items' in item:
            new['items'] = sidebar_items(item['items'], b, page_rel)
        out.append(new)
    return out


def sidebar_groups(items):
    """getSidebarGroups: loose links gather into a group without a title"""
    groups = []
    for item in items:
        if 'items' in item:
            groups.append(item)
        elif groups and 'text' not in groups[-1]:
            groups[-1]['items'].append(item)
        else:
            groups.append({'items': [item]})
    return groups


def config():
    rp = tomllib.loads((SRC / 'rustpress.toml').read_text())
    nav = []
    for item in rp['nav']:
        if 'link' in item and page_for(item['link']) in SKIP:
            continue
        new = {'text': item['text']}
        if 'link' in item:
            new['link'] = convert_link(item['link'], 'rustpress.toml')
        if 'activeMatch' in item:
            new['active_match'] = item['activeMatch']
        if 'items' in item:
            new['items'] = [{'text': x['text'], 'link': x['link']} for x in item['items']]
        nav.append(new)
    lines = [
        "# vpkit-zola's demo: rustpress's documentation (github.com/at-least/rustpress,",
        "# docs/), written in VitePress's markdown, converted for Zola and this theme",
        "# (README.md). zola serve here; base_url is where it would be published.",
        'base_url = "http://127.0.0.1:1111"',
        f'title = {toml_value(rp["title"])}',
        f'description = {toml_value(rp["description"])}',
        'theme = "vpkit-zola"',
        'compile_sass = false',
        'build_search_index = false',
        '',
        '[markdown]',
        'github_alerts = true',
        'bottom_footnotes = true',
        'insert_anchor_links = "right"',
        'external_links_target_blank = true',
        'external_links_no_referrer = true',
        'render_emoji = true',
        '',
        '[markdown.highlighting]',
        'style = "inline"',
        'light_theme = "github-light"',
        'dark_theme = "github-dark"',
        '',
        '[extra]',
        f'logo = {toml_value("/" + rp["logo"])}',
        f'nav = {toml_value(nav)}',
        f'social_links = {toml_value([{"icon": s["icon"], "link": s["link"]} for s in rp["socialLinks"]])}',
        f'edit_link = {toml_value({"pattern": "https://github.com/at-least/vpkit-zola/edit/main/demo/content/:path", "text": rp["editLink"]["text"]})}',
        f'last_updated = {toml_value(rp["lastUpdated"])}',
        f'footer = {toml_value(rp["footer"])}',
        f'outline = {toml_value(rp["outline"]["level"])}',
        f'outline_label = {toml_value(rp["outline"]["label"])}',
        'search = true',
    ]
    for prefix, side in rp['sidebar'].items():
        for group in sidebar_groups(sidebar_items(side['items'], side.get('base', prefix))):
            lines += ['', f'[[extra.sidebar.{toml_value(prefix)}]]']
            lines += [f'{k} = {toml_value(v)}' for k, v in group.items()]
    (OUT / 'config.toml').write_text('\n'.join(lines) + '\n')


def main():
    if OUT.exists():
        for sub in ('content', 'static', 'config.toml'):
            p = OUT / sub
            if p.is_dir():
                shutil.rmtree(p)
            elif p.exists():
                p.unlink()
    (OUT / 'content').mkdir(parents=True)
    pages = [convert_page(p) for p in sorted(CONTENT.rglob('*.md')) if p.name not in SKIP]
    for section in sorted({str(pathlib.PurePosixPath(p).parent) for p in pages} - {'.'}):
        index = OUT / 'content' / section / '_index.md'
        if not index.exists():
            index.write_text(f'+++\ntitle = "{section}"\nrender = false\n+++\n')
    (OUT / 'content' / 'vp-search.md').write_text(
        '+++\ntitle = "Search index"\ntemplate = "vp-search-index.html"\nin_search_index = false\n\n[extra]\nsearch = false\n+++\n')
    (OUT / 'static').mkdir()
    shutil.copy(SRC / 'static' / 'logo.svg', OUT / 'static' / 'logo.svg')
    config()
    print(f'{len(pages)} pages')


main()
