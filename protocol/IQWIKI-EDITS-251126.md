# Заметка: правки для IQ.wiki — адреса mint на страницах WEN, WIF, MEW, USDC

25.11.2026 · Wen Almanac · основание: сверка в «Сравни WEN» (протокол §121)

## Зачем

На четырёх страницах IQ.wiki о токенах Solana нет адреса mint. Название, тикер и логотип скопировать может кто угодно; адрес mint подделать нельзя. Если он есть в поле **Contract** (как на страницах BONK и Jupiter), читатель сразу видит, о каком токене речь, а «Сравни WEN» показывает «Page found» без ручной пометки.

## Как вносить (владелец)

1. Войти на iq.wiki своим кошельком (подпись делает только владелец: ключи и seed-фразы не вводятся никуда, кроме собственного кошелька).
2. Открыть страницу → **Edit** → блок Profile / Links → поле **Contract**.
3. Вставить ссылку из блока ниже, в поле «Edit summary» — текст из блока ниже.
4. Опубликовать. Правка проходит через их подтверждение (IPFS + Polygon).
5. После публикации сообщить — уберём ручную пометку из `tools/compare/iqwiki-record.json` (станет «address»).

Только адрес и источник. Без цен, оценок, рекламы и ссылок на альманах внутри текста статьи.

---

## 1. WEN — https://iq.wiki/wiki/wen

**Contract:** `https://solscan.io/token/WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk`

**Edit summary (EN):**
> Added the Solana mint address of WEN (WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk) to the Contract field. Readable on-chain: SPL Token program, 5 decimals, mint and freeze authorities revoked.

Источник: сам mint в сети Solana (getAccountInfo; живое чтение 25.11.2026, слот 473638297), еженедельная проверка mint в альманахе, страница «verified chain» альманаха.

## 2. dogwifhat (WIF) — https://iq.wiki/wiki/dogwifhat-wif

**Contract:** `https://solscan.io/token/EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm`

**Edit summary (EN):**
> Added the Solana mint address of WIF (EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm) to the Contract field, as posted by the official @dogwifcoin account at launch on November 20, 2023.

Источники: пост @dogwifcoin при запуске (CA), листинг Coinbase (сеть Solana, этот адрес).

## 3. cat in a dogs world (MEW) — https://iq.wiki/wiki/cat-in-a-dogs-world-mew

**Contract:** `https://solscan.io/token/MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5`

**Edit summary (EN):**
> Added the Solana mint address of MEW (MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5) to the Contract field. The same address is listed for MEW on Solana by Coinbase and in the Chainlink CCIP token directory.

Источники: листинг Coinbase, каталог токенов Chainlink CCIP (Solana · MEW1g…PP5).

## 4. USDC — https://iq.wiki/wiki/usdc

**Contract:** `https://solscan.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

**Edit summary (EN):**
> Added the native Solana USDC mint address (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v) to the Contract field, as published in Circle's official USDC contract addresses list.

Источник: Circle, developers.circle.com → USDC Contract Addresses (Solana).

---

## Не править (это не ошибки страниц)

- **pyusd0** — страница о PYUSD0, омничейн-версии PYUSD (LayerZero OFT), а не о Solana PYUSD. Адрес Solana PYUSD туда добавлять нельзя.
- **jito** — страница протокола Jito; в Contract указан JTO, и это верно для неё. JitoSOL — отдельный токен.

## Источники

- https://iq.wiki/wiki/wen · https://iq.wiki/wiki/dogwifhat-wif · https://iq.wiki/wiki/cat-in-a-dogs-world-mew · https://iq.wiki/wiki/usdc
- https://developers.circle.com/stablecoins/usdc-contract-addresses
- https://www.coinbase.com/price/dogwifhat · https://www.coinbase.com/price/mew
- https://docs.chain.link/ccip/directory/mainnet/token/MEW
- https://knowyourmeme.com/memes/dogwifhat-meme-coin (цитата launch-поста @dogwifcoin)
