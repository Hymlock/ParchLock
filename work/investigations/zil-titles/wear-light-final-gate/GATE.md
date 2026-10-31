# Wear + lightForms final combined gate (309x2, immutable)

- base: c07dc715 (9996cb24~1)  cand: ec8d4a6a (HEAD; incl. 9996cb24, 19109b07, cb04cc1b, fc003d92, 6051d3d8)
- Real-copy worktrees (robocopy /E /XJ games, node_modules), 0 reparse points each.
- Serial: base gate, then cand gate, N=8 GLULX=1 gate-parallel.sh; 309/309 rows each.
- diff: 7 differences (diff.txt). Serial paired rerun of the 6 games: 6 of 7 vanished; vespers flipped direction (base rerun = cand's first value, cand rerun = base's first value).

| game | field | class |
|---|---|---|
| Help.z8 | marks | FLAKY (on list; vanished on rerun) |
| cycles.z5 | rooms, inv2 | FLAKY (on list; vanished) |
| jet.z8 | marks | FLAKY (on list; vanished) |
| medusa.z5 | marks | FLAKY (on list; vanished) |
| suvehnux.z5 | marks | FLAKY (on list; vanished) |
| vespers.z8 | marks | FLAKY (on list; flips direction) |

Result: 0 REGRESSION, 0 INTENDED walk-visible change (as expected: Wear/light forms are radial-only).
harness/operator-regressions.js in cand: 13 PASS / 0 FAIL.

## sha256 of cand js/
```
8fc10cc4ae593f76c2d0747b7c84ca1ddcba8c2c69d4412f4c56fd31bea3d908 *js/ActionSynth.js
d1b1db4a41d4c98f53dfd8b6b5985cc63e3227b2eb5add7362b9e5c30649e183 *js/Actionable.js
d9b0beddd90d0fa5d2aa06da287822fce5fe2fe3f9157f513ed95f9b6a0fbac3 *js/AttrCalibrator.js
8b06db75810a1e954118ca1652174933c2830c6652c0aa8717a88127984db8b2 *js/AttributeSchema.js
e4b293af38fcd68448b3ad3dd8f65de78e721906bdd2dfe8ad14cd0ec2400c83 *js/Autocomplete.js
e2bd1c438b0c38c4f92670895768b611a8f1c5d4ed6eafa18f369a445a8945ce *js/BufferRevision.js
c3e453ebcc2484b20ae1b7038cf0b5d3c339bce467ab05100b22af556091fd33 *js/BufferTapProvider.js
783f9c960e8a8c9e03d5f6ca22ebd9b8e1cbf9cbc8c007165b60fdf1f8e851d5 *js/CharKeys.js
2ad3917585fa1dc0a16715410b272d36d30893eb70d79f99dd147df45327a4be *js/Consts.js
e8e731e4d5f536040b685b9a8d5bc2fa28196e3c8e1010b308cd3fc7475b76e9 *js/DarkScope.js
9cfb3b8831a6d120b46429b789691611a94fbf913814c33f38facb0012c01a74 *js/DirectionalRadial.js
a3df946e0235cabe92a5cc3d7cc1564433bd7027c43832e285221453d717df90 *js/Directions.js
30aef40616ea18f0260453b60659d79c8d5e179b6a9ce54d259b9942e9287f86 *js/EmglkenHost.js
30d5e51b046472f0a15716566dd51ce052f452d6ac26364389a532d5dbc1ff4e *js/EmglkenProvider.js
fc47391a17ae33f25b74b023857a03dc0c8eda5a16401428d66034eb56662df7 *js/EquipmentUI.js
317218655143df542f7eb42a3a35d90e27fb6e13a19ea79846ae221637b8fc6f *js/ExitCalibrator.js
6f68e444731e948228f1463934b9eccabd569fa6db79e083c5b9774fad6b42b6 *js/GameList.js
0e4fb31a4b8194159589504600ae2421d65acda0b0489f9dbdd3f911536dc273 *js/GlkTapProvider.js
19cd7e731ba98f09607156ada04cb7f64be1708253294c6245d74fd07534932d *js/Global.js
02e1f8483939e34f109f19e10518de90fc44402ca99948e41d2d37932d1d4d20 *js/GrammarProvider.js
c0c183eb6a4eb779ce7b0ba4e7ec14dafc1c8ac2532e222cb1919c0203b59f9c *js/GraphicsDock.js
63e6b8f4bf9cf9153d81426e44e0a5627aa665e111c891cb94a2005b9d29cf07 *js/HostEmglkenBridge.js
5a6084e898fd57852174d261db64cbb0fd03ac7c58d11874bdb836795d6e3a0a *js/IconRotation.js
48b3175d0931d0bba4d846a34f3e168505cd6be6afc17171a030de4cdd32f681 *js/Input.js
124d4dd4754d6390de7a3a67ffe106f9257c6ab5a18788517eb0bb7cd7e9f30e *js/LearnedWords.js
5e82065701609125ca8f39e838ea9114cb2d0dc67486287db720b0c975f1b664 *js/LearningStores.js
bf170f4c45fa5c434a049c7b01af0a464560d32b3564d73d8a41d8a5c08aa59d *js/LiveHeapProvider.js
6881269dc8e15a4dee3a69fcf2fe0a31ebba8048e4d5887a7f5a4e3b33c83541 *js/MainMenu.js
0768890d717842b6100626b539391dbc09523c6628d354a76e46cad2c29c48ed *js/Map.js
17772927f8068c31c6ddd1b37f31fbe63f7df939125be2e55b765985966c4514 *js/MapBeautify.js
8b31f7b0abdedf8ea0bc88f5e3221ea0a5bd7fafc1abeee8fb0a3ce8a123f6a9 *js/MapIdentity.js
1754f7a2336557def1007724d2596099ea82a99cb8d655e93e7b535f3fb91fde *js/MapTopology.js
a718a237abebbab24dfd689d20b7f1246c574f92f9f0daadddabe3be12e9e799 *js/Message.js
9efff64a3dbaaf3062da3af51a40188e63951d30744028db909aeded34c125c8 *js/MobileLayout.js
5bee5bd9ecd0df5f1de72e75a2e60b1120cd2d110b0c7de2bca23b3de68b92c4 *js/ModuleLibrary.js
60262729d81c8d951355b36ab416484b760e1a9224c88592fadaeaab2615e94b *js/ModuleStatFacts.js
dee966f416bc5b71bee08dd953d1b952431fb82e97fccc99a5d3aaee26558d6c *js/ModuleStatFactsClaude.js
667ccb82663e2a64aa1ac8f3b36747c8fcf2666b1e401596f0c2074c7fb1e79d *js/Navigator.js
8d12d4adaac10866bd1cbb25aac7cb25cb951c30fde35a0e3c25b0840b7ff010 *js/ParchLock.js
669ef7e433dcfc0acb4e72488531aae365e35350ea71eafd5d2bff52f033cbff *js/ProductInfo.js
74a470e7bbb87f829b0f13c957dbdc422a869210ae782dca150120b16f0730ad *js/PronunciationCatalog.js
0a57cce20954519c32cf0a6a1b0c8f0dbe86d93eafb579253eeddc652ccc5126 *js/Qol.js
e514d732e60005d1ac848e2de056210058554c33ce8dacea27bde13909ee291a *js/ReadAloud.js
8c03ad6f868dd7dfffdfb8392d8d92062139b371204fe193ffa1a7210a497000 *js/RemGlkTapProvider.js
dc9b85c6baaf6ee9dac62f03c222395b1fbab23a4095c600fa843c098fcc10b6 *js/SaveState.js
5f0ea556a61f59be8c18ba6639abf23d2eaba4a2050353a06af6f851bb68b349 *js/SemanticActions.js
303cdaa68b3a510adddb50a838004e69889f5dd3aa0e57b736348121c931de69 *js/StatTracker.js
6b9fb0c4485a6e7908226512f1cd251a30f9bd20169d38dc0a0920b5d4c1ce75 *js/StatusGridDecoder.js
d62d3e49aa1b818700a13486e4d1c4d9ec97e0b8e96a2767c71d9c5ec291cd56 *js/TextGate.js
5cddf48dd101579d8b0ec628f540183a89ae7546aa7b31d4d0555cd6c7fb1c7b *js/Transcript.js
5179a83c01e69eea4d6849ee87d942b3ce36d26c9aa9df4915307d0cdae124fd *js/TranslatorUI.js
97fb7542e75c8bd9d5d82c24d5a4c2366f31d8b03eed059703397b8ec2eaa1b8 *js/TurnRecorder.js
fcbebe25f96d378021d1cb97a696d319d00e8ecc4ffbd43bfe8ac5a72c34efcb *js/Tutorial.js
40dd76d3e72d41b9d90fdd1571f342872edf677634b631d2918c7b10a329b842 *js/UndoRestoreSync.js
9d64ccd89783f73138095914a4c30b4664262de7e1a78eeb2d6d2faceb1c7c7c *js/VmProbeLoader.js
2707791c92563a9e4c2686e24211f9c53fe6dc7b31ac16e96b267f8cd458db55 *js/WorkspaceUI.js
ee15830399cc06dfd18891688aef4b4e97f08cce3d231b1e4e1419fa3748843f *js/WorldMap.js
208197d5d383e67b60d4ac538c8716dfc7ef5f3d52a91f6962cdf24057820fec *js/WorldMapLayout.js
8dc673cc4559b247b3d16a14f2757c37776283c51e382f1257ed4a993cc88262 *js/WorldModel.js
7cb9a84f7e09585c56652e5bc9c6419dd664d721a760b5a74c139597a128f109 *js/ZRamProvider.js
4c7d47d956e9ec6a077e97d5e7b9c7ce57019815e253e07ffe81097082d8cecc *js/ZRamReader.js
d1b2b3f2d65827ae37989ace07fdfc586139f6f635635716e1b09470d41f011d *js/ZvmCapture.js
```
