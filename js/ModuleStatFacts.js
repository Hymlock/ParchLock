// D204 measured executable-owned command/layout relationships.
// Shared parsers remain in StatTracker/StatusGridDecoder.
// No current numeric readings or title dispatch belong here.
var ModuleStatFacts = {
    "ef6530a73b3a3b868f0c872a28944bba407d0e209bf73892af0f38a9ef6a3a48": {
        "command": "status",
        "fields": [
            "progress"
        ],
        "replyFamily": "progress-status",
        "outcome": "line",
        "inventoryReplyFamily": "progress-status",
        "rejectedForms": [
            "score"
        ],
        "evidence": "2026-10-04 isolated STATUS in Lobby/Visitor Gallery; SCORE rejected"
    },
    "7b13c904bf7608fa0de902ce7ecd5fcd0e026f293fc67baa87b99a35a3190c9e": {
        "command": "score",
        "fields": [
            "score.max"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "statusPair": [
            "Score",
            "Moves"
        ],
        "evidence": "2026-10-04 isolated SCORE0/30; work/status-module-checklist.md"
    },
    "6179b5d5b17d692ec83fe64101ff8e4092390166c2b05063e7310eb976b93ea0": {
        "command": "score",
        "fields": [
            "score.max",
            "rank"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Grok live isolated SCORE bus1134; work/status-module-checklist.md"
    },
    "ca19b493a8190382a95b15c7645480ef467207ecaa0b446525f0328b89996777": {
        "command": "score",
        "fields": [
            "score.max"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "statusPair": [
            "Score",
            "Moves"
        ],
        "evidence": "Grok live isolated SCORE bus1134; work/status-module-checklist.md"
    },
    "6804864ab849b6b3b0160b762d59badad1f2652bd5a9bcf9baa46aaec6edb42f": {
        "command": "score",
        "fields": [
            "score.max"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "statusPair": [
            "Score",
            "Moves"
        ],
        "evidence": "Grok live isolated SCORE bus1134; work/status-module-checklist.md"
    },
    "03b4f0ac551511f5bdcda4c0214fc06831ae1ef56544682935f4af982402a4cb": {
        "command": "score",
        "fields": [
            "score.max"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "2026-10-04 isolated live SCORE; work/status-module-checklist.md"
    },
    "64bb01746966c2280185a56aa6e641b65fe0353dc28a2ac1b178194aad25e006": {
        "command": "score",
        "fields": [
            "score.max",
            "rank"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "2026-10-04 isolated live SCORE; work/status-module-checklist.md"
    },
    "6c23fc11932eebb04fa9983ecf54e1062d5bd0ed50fc5923e35e471d9be158e7": {
        "command": "score",
        "fields": [],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "2026-10-04 isolated no-score reply; work/status-module-checklist.md"
    },
    "257edae1fea429656e638fa539a65c0f4e4daeb4f9669a2a5be368e6a9aca756": {
        "command": "score",
        "fields": [
            "score.max",
            "rank"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "2026-10-04 isolated SCORE/PROWESS; work/status-module-checklist.md",
        "additionalProbes": [
            {
                "command": "prowess",
                "fields": [
                    "damage",
                    "hit odds"
                ],
                "replyFamily": "combat-prowess",
                "outcome": "line"
            }
        ]
    },
    "cf9a02deb5ff99ddf05991cc76b1f6fd34ba67ea58e18cc8ed6fac6ed3022034": {
        "command": "score",
        "fields": [
            "experience",
            "experience.max",
            "certainty"
        ],
        "replyFamily": "experience-certainty",
        "outcome": "line",
        "statusPair": [
            "Exp",
            "certainty"
        ],
        "evidence": "Codex isolated SCORE 2026-10-04: You have achieved 0 out of 250 experience points. Your certainty is Lost. Grid Exp:0 Lost. Bus 1172."
    },
    "c2f28a4ddd9367c260946926a33c73a4b0cc38b1f327646cc1202182a28a10ff": {
        "command": "score",
        "fields": [
            "score.max"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Grok first-open 2026-10-04: You have so far scored 0 out of a possible 100 points; you are at the threshold of a foreboding mystery. Prose is not an explicit rank field; rank omitted."
    },
    "94235d09a03e64171ce343ada0f2bc9b13225bfb9898c1f5732c731a8e877cf8": {
        "command": "score",
        "fields": [
            "score.max",
            "rank"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Grok first-open 2026-10-04 SCORE: You have so far scored 0 out of a possible 70, in 1 turn, earning you the status of Musical Neophyte. DIAGNOSE: You feel a little gravitationally inclined at the moment. (not health)."
    },
    "2a92da4be31e6c54d90ba060a17f65548e44ca1ab0f0854e1ee8b25a8d954efb": {
        "command": "score",
        "fields": [
            "score.max",
            "rank"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Grok first-open 2026-10-04 SCORE: You have scored 0 out of 60 points. You have reached the rank of Novice Adventurer. fulfillment=complete 0/60."
    },
    "8494e1f13c0c187af9e4e2befc0a1da1911f2bee9ac68398a7f3d01138e2f737": {
        "command": "score",
        "fields": [
            "holiness",
            "holiness.max"
        ],
        "replyFamily": "labelled-holiness",
        "outcome": "line",
        "evidence": "Provisional historical: Your current holiness is 0 out of a possible holiness of 100, in 0 moves. Codex prefers SCORE primary (not HOLINESS duplicate). Live first-open pending restore=no.",
        "additionalProbes": [
            {
                "command": "magic",
                "fields": [
                    "magic"
                ],
                "replyFamily": "possessive-magic",
                "outcome": "line",
                "evidence": "Historical: Lornedei's magic is currently at 80. Inventory may also print magic."
            }
        ]
    },
    "9c9561c3ef05076bde39bc9442760f4ceaf783256aa2300f0d0fda7c5a70aa1f": {
        "command": "score",
        "fields": [],
        "replyFamily": "no-score",
        "outcome": "line",
        "statusPair": [
            "Moves"
        ],
        "evidence": "Grok first-open 2026-10-04 SCORE: (There is no score in this game.) Moves only; fulfillment=complete."
    },
    "10e717578f85200c6aadc8149d95e43f7b6c09fb473770d309a0d6afe3b29538": {
        "command": "score",
        "fields": [
            "score.max",
            "rank"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Grok first-open 2026-10-04 SCORE: You have so far scored 0 out of a possible 51, in 2 turns, earning you the rank of lost dreamer. DIAGNOSE not confirmed health."
    },
    "e0c21b34d9b90e8e711e66cce335f57c46ffcef5f72891c410a9d8ccea1adfec": {
        "command": "score",
        "fields": [
            "score.max",
            "rank"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Checklist DDIV Hairless Ape; score 0 of 86"
    },
    "330100bf1c1ab8ed64065ceb58145ebb87cb6faef5b331fbc6684be4f14fe7da": {
        "command": "score",
        "fields": [
            "score.max",
            "rank"
        ],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Grok first-open 2026-10-04 SCORE: 0/550 hapless Tourist; Date June 3rd 1993; health still breathing."
    },
    "4d054e03616ec2fac3a2dce408ff8007ceff8ff0bde43f504c89dc1bdb12c8be": {
            "command": "score",
            "fields": [
                    "score.max",
                    "rank"
            ],
            "replyFamily": "inform-score",
            "outcome": "line",
            "evidence": "Checklist Enemies SCORE 0/100 top accountants rank. Live first-open pending with fact."
    },
    "9b22b4c7321fc75c32638ca5a5fa33703b9993c3f3a478e05a3aa9ede03bdd77": {
            "command": "score",
            "fields": [
                    "score.max",
                    "rank"
            ],
            "replyFamily": "inform-score",
            "outcome": "line",
            "evidence": "Checklist farm SCORE 0/85 naughty beginner. Live needs continue=yes before line."
    },
    "bb54f56f1c77d7069912137292d18e789278a0bcf30332ef7e401695011b9774": {
        "command": "score",
        "fields": ["score.max"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Checklist GreatXavio SCORE 0 out of a possible 100"
    },
    "251a02ace56207ff0b213e942a63732d3be6212c74a8a4e1412aa1c1aa7fb616": {
        "command": "score",
        "fields": ["score.max", "rank"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Checklist Heist SCORE 0 of 200 innocent young woman"
    },
};
if (typeof module !== "undefined" && module.exports) module.exports = ModuleStatFacts;
