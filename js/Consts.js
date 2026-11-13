const BUILD = 87;
const APPNAME = "ParchLock";
const GA_TRACK = true;

var story = (typeof Global !== "undefined" && Global.GetUrlParameter) ? Global.GetUrlParameter("story") : null;

// An Eamon module runs its own engine: the vendor loader is pointed at ParchLock's Eamon host in place
// of the Z-machine engine. The story id itself is unchanged for the rest of ParchLock.
var storyIsEamon = !!story && /\.eamon(\.js)?$/i.test(story);

var parchment_options = {
    
    default_story: [ storyIsEamon ? 'lib/eamon/story.z8.js' : story ],
    // The product loader already supplies the selected story bytes, including local imports.
    use_query_story: false,
    lib_path: storyIsEamon ? 'lib/eamon/' : 'lib/',
    page_title: 0
};

console.log(APPNAME + " build " + BUILD + " by Roy Lazarovich");
