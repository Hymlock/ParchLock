from pathlib import Path
p=Path('js/SaveState.js');s=p.read_text(encoding='utf-8')
a='''        var path = PlaythroughState.path();
        if (!path) return null;'''
b='''        var path = PlaythroughState.path();
        if (!path) return null;
        var provider = typeof ModuleLibrary !== "undefined" && typeof ModuleLibrary.currentExecutableDigest === "function";
        var boundTranscript = typeof Transcript !== "undefined" && Transcript.storyPath === path && /^[a-f0-9]{64}$/.test(String(Transcript.digest || ""));
        if (!provider && !boundTranscript) return null; // no possible exact-identity authority
'''
assert s.count(a)==1;s=s.replace(a,b,1);p.write_text(s,encoding='utf-8')
