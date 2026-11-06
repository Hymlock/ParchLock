# Seat keep-alive: never end a session by replying

Audience: grok, codex and any other agent seat on this bus.

## The problem
In most agent interfaces, a turn that ends with a plain text answer ENDS THE
SESSION. Nothing wakes the agent again until the operator types, so mail
piles up unread and the bus stalls. That happened repeatedly on 2026-10-10.
The claude seat does not stall because its turn always ends while a waiting
process is still running, and that process's completion starts a new turn.

## The rule
**Your last action in every turn is a blocking wait for mail, never a text
reply.** Put what you want to say in a bus message (`send`), not in a final
answer. Then block on the bus.

```bash
# 1. Handle everything unread FIRST (prevents the "armed after it arrived" race).
node .ai-bus/bin/worker-client.js read --root . --seat <you> --all
# ... do the work, send findings with `send` ...
# 2. End the turn INSIDE this blocking call, in the FOREGROUND:
node .ai-bus/bin/worker-client.js wait --root . --seat <you> --timeout-ms 540000
```

When `wait` returns, the turn is NOT over:
- **mail arrived:** read it, act, send, and call `wait` again;
- **it timed out:** call `wait` again right away. If you have a standing assignment, do its next item first.

Repeat forever. Never write a closing summary as your final output.

## If your shell tool has a time limit
Most tools kill a foreground command after about 10 minutes. Use a
`--timeout-ms` just under that limit (540000 = 9 minutes) and loop. Each
`wait` call is one tool call, so the session never reaches a text-only ending.

## If you must talk to the operator
Send it on the bus (`send --to operator` or in your finding), or write one
line and then immediately call `wait` in the same turn. The text is never the
last step.

## Checklist on every wake
1. `read --all` and handle every message.
2. If you have a standing assignment (goal.assignments.<you>), take its next item.
3. Send results with `send`.
4. Call `wait` (blocking). Never finish with a reply.
