# Bilingual Retell Agent — Configuration

For pilot restaurants whose customer base is bilingual (e.g., a Little Caesars in Modesto with a substantial Spanish-speaking customer base), OMRI's Retell agent should auto-detect the caller's language from their first utterance and respond in matching language for the rest of the call.

This is a per-agent dashboard configuration in Retell — **no code changes required**. Apply at provisioning time when a restaurant's `language_preference` is set to `bilingual`.

---

## Why Retell-native auto-detect, not "two agents"

Earlier OMRI provisioning created two separate agents per restaurant — one English (`retell_agent_id`), one Spanish (`retell_agent_id_es`) — and routed inbound calls based on a guess from the dialed number or area code. That is no longer the right pattern:

- Adds another row of state per restaurant
- Doesn't handle code-switching mid-call
- Doubles the prompt iteration surface

Retell now supports `multi_language_detection` natively. One agent, one prompt (with bilingual sections), language flips on the fly.

---

## Configuration in Retell dashboard

1. Open the restaurant's agent in Retell dashboard.
2. **Voice → Language settings:**
   - **Primary language:** `English` (always — the first hello is in English to match Twilio caller-greeting expectations)
   - **Auto-detect language:** **ON**
   - **Supported languages:** `English (US)`, `Spanish (US)`
3. **TTS voice:** pick a voice that is rated bilingual in the Retell voice library (e.g., `eleven_labs/multilingual_v2:` voices). Single-language voices will sound robotic when forced into the other language.
4. **Prompt → System message:** add a bilingual greeting block at the very top, before any instructions:

   ```
   You are OMRI answering for {{restaurant_name}}.
   The caller's language is auto-detected from their first words.

   - If they speak English, respond in English using the prompt below.
   - If they speak Spanish, respond in Spanish using the same instructions
     translated. Maintain Spanish for the rest of the call unless they
     switch back to English mid-call.
   - For prices, items, and menu names, keep them in the original language
     they appear on the menu (Spanish menu items stay in Spanish even when
     speaking English to a customer).

   ---
   [rest of normal English prompt below]
   ```

5. **Tool calls:** unchanged. Tool routes (`/api/tools/*`) accept the same args regardless of language; they use `restaurant.id` from the agent_id lookup, not language.
6. **Test:** in Retell Test LLM panel, run two calls — one starting "hi" (English), one starting "hola" (Spanish). Confirm the agent flips and stays.

---

## Provisioning script changes

When provisioning a bilingual restaurant via `/api/provisioning/create`, set on the restaurants row:

```ts
preferred_language: 'bilingual',
retell_agent_id: <single agent_id from above>,
retell_agent_id_es: null,  // intentionally null — single bilingual agent now
```

The webhook routing in `/api/webhooks/retell` and tool-route restaurant lookups already check both `retell_agent_id` and `retell_agent_id_es` columns, so leaving the `_es` column null is safe.

---

## Apply this when

- A franchisee tells us their customer base is bilingual.
- A franchisee location is in a high-Spanish-speaking ZIP (Central Valley CA, South Texas, Miami, etc.) and they haven't told us either way.
- The pilot agent transcripts show repeated `<lang_unknown>` segments — caller was speaking Spanish but the agent answered English.

The pilot's first ~50 calls are the data point that decides this. Default new restaurants to English-only and flip to bilingual after observation.
