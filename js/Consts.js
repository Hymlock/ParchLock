const BUILD = 86;
const APPNAME = "ParchLock";
const GA_TRACK = true;

var story = (typeof Global !== "undefined" && Global.GetUrlParameter) ? Global.GetUrlParameter("story") : null;

var parchment_options = {
    
    default_story: [ story ],
    // The product loader already supplies the selected story bytes, including local imports.
    use_query_story: false,
    lib_path: 'lib/',
    page_title: 0
};

console.log(APPNAME + " build " + BUILD + " by Roy Lazarovich");
