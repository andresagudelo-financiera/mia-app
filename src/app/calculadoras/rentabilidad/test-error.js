console.log("TEST SCRIPT LOADED");
window.addEventListener('error', function(e) {
  const div = document.createElement('div');
  div.style = 'position:fixed;top:0;left:0;z-index:999999;background:red;color:white;padding:20px;font-size:16px;width:100%;word-wrap:break-word;';
  div.innerText = 'GLOBAL ERROR: ' + e.message + ' at ' + e.filename + ':' + e.lineno;
  document.body.appendChild(div);
});
window.addEventListener('unhandledrejection', function(e) {
  const div = document.createElement('div');
  div.style = 'position:fixed;top:0;left:0;z-index:999999;background:orange;color:black;padding:20px;font-size:16px;width:100%;word-wrap:break-word;';
  div.innerText = 'PROMISE ERROR: ' + e.reason;
  document.body.appendChild(div);
});
