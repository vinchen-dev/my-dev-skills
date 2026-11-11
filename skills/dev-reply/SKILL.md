---
name: dev-reply
description: Draft the message the user will send to someone outside this conversation, such as a DBA, QA, a product owner, another team or a vendor, from facts the conversation has already established. Use it whenever the user asks for a reply, a follow-up, a message, what to tell, send or answer someone, or how to respond to a pushback or question they pasted or screenshotted, even when no recipient is named. Also use it when the user asks to explain what happened to a non-technical team such as accounting, operations or support, including a root cause and suggested fix to pass on. Produces one short chat-ready message that answers their last point, gives the figure that decides it and makes one ask; for a non-technical reader, a plain-language root cause and suggested fix. Not for a ticket write-up of an investigation (dev-ticket-summary) or for commit and PR text (dev-commit-pr).
---

# dev-reply

Write the message the user pastes into a chat with someone who was not in this conversation. The user speaks for their team, the recipient is busy, and the thread has usually gone back and forth already, so the message has to land its point in the first sentences and ask for one thing. The reply goes in your answer as a quoted block the user can copy; write a file only when asked.

## Process

1. **Read what they last said.** From the paste, the screenshot or the user's summary, pin down the recipient's role, their exact claim or question, and what they already have from earlier messages. A reply that answers something they did not say, or resends proof they already got, reads as not listening. Done when you can state their point in one sentence.
2. **Pin the ask.** One thing the user wants from them, specific enough to act on without a question back: the index name, the version, the date, the decision. The user's message usually names it; when it does not, ask once before drafting. Done when the ask is one sentence with one question mark or none.
3. **Pick the facts that decide it.** From the conversation only: the measured result, the count, the plan stage, the behaviour seen. Every figure needs a run or a source in this session. Something the user wants to say that the session did not establish goes in a one-line flag above the reply, never into the reply as fact. A claim the session itself marked assumed or not verified, or hedged with a word such as "probably", keeps that mark as one plain clause, such as "most likely" or "not confirmed yet", or stays out. Done when every sentence of the draft traces to something in the conversation, with the certainty the conversation gave it.
4. **Write the short form** from the template below, then cut. Done when it is a chat message rather than a document: three to five sentences, the ask stated once, nothing after it. The proof form is for when the recipient asked for evidence or the user asked for stats or a comparison, not the default; the user's first correction is almost always "make it concise". The explanation form is for a reader who is not technical and needs to know what happened, such as accounting after a false alert or a wrong figure; use it when the user says so or asks for a root cause and suggested fix to pass on.
5. **Check the voice** against the rules below and give the user the message on its own. One line above it only for a flagged fact or an assumption. When the user also asked a question for themselves ("will 60 s cause problems later?"), answer that in two or three lines above the block, then the reply.

## Template

```
<Opener only on a follow-up or a first contact, in the user's register: "Following up on this." or "Good morning, following up on this.">
<Their point, answered in one or two sentences, with the reason it holds or does not.>
<The figure or result that decides it, inline.>
<The ask, one sentence, naming the exact thing.>
```

Proof form, when evidence was asked for: the same shape with a small table comparing the two setups side by side (plan, rows matched, documents read, time, where measured) and the exact command or query in a code block so they can rerun it. Still one ask, still nothing after it.

Explanation form, for a reader who is not technical and needs to know what happened and what to do:

```
**Root cause:** <What they saw, named the way they saw it. Whose side it came from: ours, the bank's, a vendor's, theirs. What actually caused it, in one or two plain sentences. What was not affected, when that is what they will worry about, such as no money lost or no deposit missed.>

**Suggested fix:** <The fix the user agreed, at the scope they agreed, described by what the reader will see afterwards rather than how it is built. Promise only what the session expects the fix to do: when it accepted that some cases can still fail, name them in the reader's words, such as "a very long date range can still show the message". Then the one thing they should do until it ships.>
```

Two labelled parts and nothing after them. The ask is the last sentence of the fix, so it is still one ask.

## Rules of voice

- **Statements, not hedges.** "A 60 s timeout only delays the error" rather than "I think a longer timeout might not fully address it". The user asks for "a statement" when a draft wobbles. This is about tone, not certainty: a claim the session marked assumed keeps its mark (step 3).
- **One ask, one question mark.** A reply that asks three things gets none answered. An inquiry that carries its reason is fine: "Could we build the index instead, since the longer limit keeps the full read?"
- **Answer their reason, not just their conclusion.** When a DBA says fields belong in an index only if filtered or sorted on, the reply says what the extra fields do (cover the query so no document is read), not merely that we still want them.
- **Their vocabulary, and the term they can search.** For an expert, name the exact thing (`PROJECTION_COVERED`, `FETCH`, the index name, the config key) and do not define it; a definition reads as a lecture, while the bare term in a parenthesis lets them look it up. For a product or ops reader, no internals: say what they see and when.
- **A non-technical reader gets no code at all.** No file names, functions, flags, error text, log lines or internal environment names; name the screen, the message and the time they saw it, and call an environment what they call it. One plain sentence of mechanism is enough when it answers "how could that happen", said the way a colleague would say it across a desk.
- **Numbers only where they decide.** Keep the exact count when it is the proof (215,309 rows, 0 documents read, 180 ms) and say where it was measured (QAT, 6-month range). Leave out a number that does not change what the recipient will do.
- **"We" for the team, plain words, no filler.** No "kindly", "as per", "please be advised", exclamation marks or emoji. It should read as if a colleague typed it.
- **No commitments the user did not make.** Do not add "we will verify and confirm before..." or a date unless the user said it; they will be held to it. The same goes for outcomes: do not say a problem stops when the session accepted that it can still happen.
- **Do not repeat what the thread already has.** On a follow-up, point back ("based on the QAT results above") instead of resending the table.
- **Code only when they need to run or find it.** An index name, a query, a command, in backticks or a code block. Never for emphasis.

## Example

A worked example with the recipient's pushback, the short form, what was cut, the proof form and the explanation form is in `example.md` in this folder. Read it the first time in a session, or when unsure how much to cut.
