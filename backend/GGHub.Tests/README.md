# GGHub.Tests

Gamification motoru testleri. Gercek Postgres ister (advisory lock, ON CONFLICT ve
benzersiz indeks davranisi InMemory saglayicida yok).

Yerel test veritabani (tek seferlik):

```bash
docker run -d --name pausemenu-test-pg -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=pausemenu_test -p 127.0.0.1:55432:5432 postgres:17-alpine
```

Calistirma:

```bash
dotnet test backend/GGHub.Tests
```

Baglanti `GG_TEST_DB` ortam degiskeniyle degistirilebilir. Duzenek host localhost degilse
calismayi reddeder: testler veritabanini silip yeniden kurar.
