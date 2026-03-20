# Release Otomasyonu ve CI

Bu not, Domizan desktop sÃ¼rÃ¼mÃ¼nÃ¼n gÃ¼nlÃ¼k geliÅŸtirme akÄ±ÅŸÄ± ile release akÄ±ÅŸÄ±nÄ± ayÄ±rmak iÃ§in eklendi.

## 1. Yeni Kural

- Her `push` release Ã¼retmez.
- Her `push` yalnÄ±zca `CI` workflow'unu tetikler.
- KullanÄ±cÄ±ya gidecek her yeni sÃ¼rÃ¼mde versiyon artmalÄ±dÄ±r.
- Release sadece `v*` tag push ile Ã§Ä±kar.

## 2. Workflow'lar

CI:

- dosya: [.github/workflows/ci.yml](C:/Users/acero/Documents/GitHub/domi-ass/.github/workflows/ci.yml)
- tetikleme: `push` on `main`, `pull_request`
- gÃ¶rev: desktop build + backend build doÄŸrulamasÄ±

Release:

- dosya: [.github/workflows/release-desktop.yml](C:/Users/acero/Documents/GitHub/domi-ass/.github/workflows/release-desktop.yml)
- tetikleme: `v*` tag push
- gÃ¶rev: GitHub Release + Windows/macOS artefakt Ã¼retimi

## 3. Komutlar

Versiyon yardÄ±mcÄ±larÄ±:

- `npm run release:patch`
- `npm run release:minor`
- `npm run release:major`
- `npm run release:status`
- `npm run release:tag`
- `npm run release:publish-tag`

YardÄ±mcÄ± script:

- [release-helper.cjs](C:/Users/acero/Documents/GitHub/domi-ass/tools/release-helper.cjs)

## 4. GÃ¼nlÃ¼k GeliÅŸtirme AkÄ±ÅŸÄ±

1. Kod yaz.
2. Commit al.
3. `git push origin main`

Beklenen:

- `CI` Ã§alÄ±ÅŸÄ±r
- build doÄŸrulamasÄ± alÄ±nÄ±r
- release Ã§Ä±kmaz

## 5. KullanÄ±cÄ±ya GÃ¼ncelleme GÃ¶nderme AkÄ±ÅŸÄ±

1. `npm run release:patch`
2. `git add .`
3. `git commit -m "Release vX.Y.Z"`
4. `git push origin main`
5. `npm run release:publish-tag`

Beklenen:

- `vX.Y.Z` tag'i origin'e gider
- `Release Desktop` workflow'u tetiklenir
- GitHub Release oluÅŸur
- `latest.yml` ve installer artefaktlarÄ± yayÄ±nlanÄ±r
- kurulu Domizan yeni sÃ¼rÃ¼mÃ¼ updater ile gÃ¶rÃ¼r

## 6. Neden BÃ¶yle

Bu ayrÄ±m sayesinde:

- her geliÅŸtirmede repo release ile kirlenmez
- sadece daÄŸÄ±tÄ±lacak sÃ¼rÃ¼mler versiyonlanÄ±r
- updater mantÄ±ÄŸÄ± net kalÄ±r
- ekipte herkes aynÄ± release ritmini izler
