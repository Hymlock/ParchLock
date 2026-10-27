from pathlib import Path
p=Path('android/app/src/main/java/com/parchlock/app/RotatingIconWidget.java');s=p.read_bytes();a=b'    static boolean canPin(Context c) {';assert s.count(a)==1;p.write_bytes(s.replace(a,b'    @androidx.annotation.ChecksSdkIntAtLeast(api = 26)\r\n'+a))
p=Path('android/local.properties');p.write_text('sdk.dir=C\\:/Users/hymlo/Downloads/Projects/AndroidDevKit/sdk\n',encoding='utf-8')
