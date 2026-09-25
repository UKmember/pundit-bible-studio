# Builds the app into dist/ (run by the "Deploy app" workflow).
import os, shutil, time
S = lambda f: open(os.path.join('src', f), encoding='utf-8').read()
os.makedirs('dist', exist_ok=True)
e = S('engine_base.js')
x = S('engine_extra.js') + '\n' + S('engine_tt_head.js') + '\n' + S('seedance.js') + '\n' + S('publish.js')
a = S('app.js') + '\n' + S('video.js') + '\n' + S('studio.js') + '\n' + S('clips.js') + '\n' + S('earnings.js')
logo = S('logo_b64.txt')
h = S('head.html').replace('{{PLAYBOOK}}', S('playbook.html')).replace('{{CREATE}}', S('create.html')).replace('{{INSIGHTS}}', S('insights.html')).replace('{{VIDEO}}', S('video.html')).replace('{{SETTINGS}}', S('settings.html')).replace('{{LOGO}}', logo)
v = str(int(time.time()))
head = f'''<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#031F60">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Pundit Bible">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" href="icons/icon-192.png">
<link rel="stylesheet" href="standalone.css?v={v}">
<script src="config.js?v={v}"></script>
<script src="supabase.js"></script>
<script src="backend.js?v={v}"></script>
'''
tail = '\n<script>\n(function(){\nconst LOGO_SRC=' + repr(logo) + ';\n' + e + '\n' + x + '\n' + a + '\n})();\n</script>\n<script>if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");</script>\n</body></html>\n'
open('dist/index.html', 'w', encoding='utf-8').write(head + h.replace('<title>', '<title>', 1).replace('</style>', '</style>\n</head><body>', 1) + tail)
for f in os.listdir('web'):
    p = os.path.join('web', f)
    if os.path.isdir(p): shutil.copytree(p, os.path.join('dist', f), dirs_exist_ok=True)
    else: shutil.copy(p, 'dist')
sw = open('dist/sw.js', encoding='utf-8').read().replace('__VERSION__', v)
open('dist/sw.js', 'w', encoding='utf-8').write(sw)
open('dist/.nojekyll', 'w').write('')
print('Built dist/index.html (version ' + v + ')')
