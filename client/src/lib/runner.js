// Builds a self-contained srcdoc from the room's HTML/CSS/JS files for the sandboxed preview.
const CAPTURE = `<script>
(function(){
  function send(level,args){try{parent.postMessage({__coderoom:true,level:level,text:args.map(function(a){
    try{return typeof a==='string'?a:JSON.stringify(a)}catch(e){return String(a)}}).join(' ')},'*')}catch(e){}}
  ['log','info','warn','error'].forEach(function(l){var o=console[l];console[l]=function(){send(l,[].slice.call(arguments));o.apply(console,arguments)}});
  window.addEventListener('error',function(e){send('error',[e.message+(e.lineno?' (line '+e.lineno+')':'')])});
  window.addEventListener('unhandledrejection',function(e){send('error',['Unhandled promise rejection: '+(e.reason&&e.reason.message||e.reason)])});
})();
<\/script>`;

const safeScript = (s) => s.replace(/<\/script/gi, '<\\/script');

export function buildSrcDoc(files, getContent) {
  const byName = new Map(files.filter((f) => f.type === 'file').map((f) => [f.name, f]));
  const htmlFile = byName.get('index.html') || files.find((f) => f.type === 'file' && f.name.endsWith('.html'));
  if (!htmlFile) return null;

  let html = getContent(htmlFile.id);

  html = html.replace(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
    const f = byName.get(href.split('/').pop());
    if (f && /\.css$/i.test(f.name)) return `<style>${getContent(f.id)}</style>`;
    return tag;
  });
  html = html.replace(/<script([^>]*)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (tag, a, src, b) => {
    const f = byName.get(src.split('/').pop());
    if (f && /\.js$/i.test(f.name)) return `<script${a}${b}>${safeScript(getContent(f.id))}<\/script>`;
    return tag;
  });

  return CAPTURE + html;
}
