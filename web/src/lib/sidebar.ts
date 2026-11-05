// Shared between the <head> script (server) and the rail (client), so it lives outside "use client".
export const SIDEBAR_KEY = "sidebar";

// Runs in <head> before first paint so a collapsed sidebar doesn't flash open on load.
export const SIDEBAR_SCRIPT = `(function(){try{if(localStorage.getItem("${SIDEBAR_KEY}")==="collapsed")document.documentElement.setAttribute("data-sidebar","collapsed")}catch(e){}})()`;
