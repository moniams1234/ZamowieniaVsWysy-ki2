# FlowControl AI — Zamówienia vs wysyłki 2

Bezpieczna aplikacja Next.js do importu zamówień i wysyłek, analizy realizacji oraz pracy z wieloagentowym zespołem AI.

## Co zmieniło się względem pierwszej wersji

- dane nie są wbudowane w publiczny HTML ani przechowywane w GitHub,
- użytkownik loguje się przez Supabase Auth,
- XLSX trafia przez chroniony endpoint do PostgreSQL,
- Row Level Security izoluje dane użytkowników,
- OpenAI Agents SDK uruchamia koordynatora i specjalistów jako narzędzia,
- agenci samodzielnie wywołują kontrolowane funkcje Supabase,
- repozytorium nie zawiera danych klientów ani sekretów.

## Uruchomienie

1. Utwórz bezpłatny projekt w Supabase.
2. W SQL Editor wykonaj `supabase/migrations/001_initial.sql`.
3. Skopiuj `.env.example` do `.env.local` i uzupełnij wartości.
4. W Supabase Authentication włącz Email/Password. Do zastosowania firmowego wyłącz publiczną rejestrację po utworzeniu zatwierdzonych kont.
5. Uruchom:

```bash
npm install
npm run dev
```

## Migracja danych z poprzedniego repo

Nie kopiuj katalogu `Dane wsadowe`, `dane.db` ani plików XLSX do tego repozytorium. Po uruchomieniu aplikacji:

1. zaloguj się,
2. przejdź do **Źródła danych**,
3. zaznacz jednocześnie wszystkie pliki z dawnego katalogu `Dane wsadowe`,
4. aplikacja rozpozna typ każdego pliku i zapisze rekordy w Supabase.

Import jest idempotentny: naturalne klucze tabel aktualizują istniejące rekordy. Każdy import ma osobny wpis w `import_batches`.

## Deploy na Vercel

Dodaj zmienne `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` i `OPENAI_API_KEY`. Nie ustawiaj jednego modelu na sztywno: agent-router wybiera z zatwierdzonego portfela Luna / Terra / Sol według kosztu, złożoności i ryzyka. Żaden klucz `service_role` nie jest potrzebny — operacje wykonują się w kontekście zalogowanego użytkownika i zasad RLS.

## Ważne

Supabase Free wystarcza na pilotaż, ale projekt może zostać wstrzymany przy dłuższej nieaktywności. OpenAI API jest rozliczane oddzielnie według wykorzystania.
