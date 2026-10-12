#!/bin/bash
export PATH=/opt/node24/bin:$PATH
cd /home/user/kipindi-l2
OUT=/tmp/claude-0/l3/l2pg24; mkdir -p $OUT; : > $OUT/SUMMARY
for db in l2pg_landed e2e_money2 e2e_fault2; do
  psql -h 127.0.0.1 -p 55432 -U postgres -c "create database $db" >/dev/null 2>&1
  DATABASE_URL="postgresql://postgres@127.0.0.1:55432/$db" npx prisma migrate deploy > $OUT/migrate-$db.log 2>&1; echo "$? migrate $db" >> $OUT/SUMMARY
done
psql -h 127.0.0.1 -p 55432 -U postgres -d e2e_fault2 -c "insert into \"SystemConfig\"(key, value, \"updatedAt\") values ('__LOAD_TEST_TARGET__', '\"I_AM_A_DISPOSABLE_LOAD_TEST_DB\"'::jsonb, now())" >/dev/null 2>&1
DATABASE_URL="postgresql://postgres@127.0.0.1:55432/l2pg_landed" USE_PRISMA_DAL=true timeout 900 npx tsx scripts/bet-landed-key.test.mts > $OUT/pg-bet-landed-key.log 2>&1; echo "$? pg:test:bet-landed-key" >> $OUT/SUMMARY
DATABASE_URL="postgresql://postgres@127.0.0.1:55432/e2e_money2" USE_PRISMA_DAL=true timeout 1800 npm run -s e2e:money > $OUT/e2e-money.log 2>&1; echo "$? e2e:money" >> $OUT/SUMMARY
DATABASE_URL="postgresql://postgres@127.0.0.1:55432/e2e_fault2" USE_PRISMA_DAL=true timeout 1800 npm run -s e2e:fault > $OUT/e2e-fault.log 2>&1; echo "$? e2e:fault" >> $OUT/SUMMARY
echo DONE >> $OUT/SUMMARY
