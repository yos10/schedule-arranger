'use strict';

const request = require('supertest');
const assert = require('assert');
const app = require('../app');
const passportStub = require('passport-stub');
const User = require('../models/user');
const Schedule = require('../models/schedule');
const Candidate = require('../models/candidate');
const Availability = require('../models/availability');
const Comment = require('../models/comment');
const deleteScheduleAggregate = require('../routes/schedules').deleteScheduleAggregate;

describe('/login', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('ログインのためのリンクが含まれる', () => {
    return request(app)
      .get('/login')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(/<a class="btn btn-info my-3" href="\/auth\/github"/)
      .expect(200);
  });

  test('ログイン時はユーザー名が表示される', () => {
    return request(app)
      .get('/')
      .expect(/testuser/)
      .expect(200);
  });
});

describe('/logout', () => {
  test('ログアウト時に / にリダイレクトされる', () => {
    return request(app).get('/logout').expect('Location', '/').expect(302);
  });
});

describe('/schedules', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('予定が作成でき、表示される', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .get('/schedules/new')
        .end((err, res) => {
          const match = res.text.match(/<input type="hidden" name="_csrf" value="(.*?)">/);
          const csrf = match[1];

          request(app)
            .post('/schedules')
            .set('cookie', res.headers['set-cookie'])
            .send({
              scheduleName: 'テスト予定1',
              memo: 'テストメモ1\r\nテストメモ2',
              candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3',
              _csrf: csrf,
            })
            .expect('Location', /schedules/)
            .expect(302)
            .end((err, res) => {
              const createdSchedulePath = res.headers.location;
              request(app)
                .get(createdSchedulePath)
                .expect(/テスト予定1/)
                .expect(/テストメモ1/)
                .expect(/テストメモ2/)
                .expect(/テスト候補1/)
                .expect(/テスト候補2/)
                .expect(/テスト候補3/)
                .expect(200)
                .end((err, res) => {
                  deleteScheduleAggregate(
                    createdSchedulePath.split('/schedules/')[1],
                    done,
                    err
                  );
                });
            });
        });
    });
  });
});

describe('/schedules/:scheduleId/users/:userId/candidates/:candidateId', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('出欠が更新できる', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .get('/schedules/new')
        .end((err, res) => {
          const match = res.text.match(
            /<input type="hidden" name="_csrf" value="(.*?)">/
          );
          const csrf = match[1];

          request(app)
            .post('/schedules')
            .set('cookie', res.headers['set-cookie'])
            .send({
              scheduleName: 'テスト出欠更新予定1',
              memo: 'テスト出欠更新メモ1',
              candidates: 'テスト出欠更新候補1',
              _csrf: csrf,
            })
            .end((err, res) => {
              const createdSchedulePath = res.headers.location;
              const scheduleId = createdSchedulePath.split('/schedules/')[1];
              Candidate.findOne({
                where: { scheduleId },
              }).then((candidate) => {
                // 更新がされることをテスト
                const userId = 0;
                request(app)
                  .post(
                    `/schedules/${scheduleId}/users/${userId}/candidates/${candidate.candidateId}`
                  )
                  .send({ availability: 2 }) // 出席に更新
                  .expect('{"status":"OK","availability":2}')
                  .end((err, res) => {
                    Availability.findAll({
                      where: { scheduleId },
                    }).then((availabilities) => {
                      assert.strictEqual(availabilities.length, 1);
                      assert.strictEqual(availabilities[0].availability, 2);
                      deleteScheduleAggregate(scheduleId, done, err);
                    });
                  });
              });
            });
        });
    });
  });
});

describe('/schedules/:scheduleId/users/:userId/comments', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('コメントが更新できる', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .get('/schedules/new')
        .end((err, res) => {
          const match = res.text.match(
            /<input type="hidden" name="_csrf" value="(.*?)">/
          );
          const csrf = match[1];

          request(app)
            .post('/schedules')
            .set('cookie', res.headers['set-cookie'])
            .send({
              scheduleName: 'テストコメント更新予定1',
              memo: 'テストコメント更新メモ1',
              candidates: 'テストコメント更新候補1',
              _csrf: csrf,
            })
            .end((err, res) => {
              const createdSchedulePath = res.headers.location;
              const scheduleId = createdSchedulePath.split('/schedules/')[1];
              // 更新がされることをテスト
              const userId = 0;
              request(app)
                .post(`/schedules/${scheduleId}/users/${userId}/comments`)
                .send({ comment: 'testcomment' })
                .expect('{"status":"OK","comment":"testcomment"}')
                .end((err, res) => {
                  Comment.findAll({
                    where: { scheduleId: scheduleId },
                  }).then((comments) => {
                    assert.strictEqual(comments.length, 1);
                    assert.strictEqual(comments[0].comment, 'testcomment');
                    deleteScheduleAggregate(scheduleId, done, err);
                  });
                });
            });
        });
    });
  });
});

describe('/schedules/:scheduleId?edit=1', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('予定が更新でき、候補が追加できる', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .get('/schedules/new')
        .end((err, res) => {
          const match = res.text.match(
            /<input type="hidden" name="_csrf" value="(.*?)">/
          );
          const csrf = match[1];
          const setCookie = res.headers['set-cookie'];

          request(app)
            .post('/schedules')
            .set('cookie', setCookie)
            .send({
              scheduleName: 'テスト更新予定1',
              memo: 'テスト更新メモ1',
              candidates: 'テスト更新候補1',
              _csrf: csrf,
            })
            .end((err, res) => {
              const createdSchedulePath = res.headers.location;
              const scheduleId = createdSchedulePath.split('/schedules/')[1];
              // 更新がされることをテスト
              request(app)
                .post(`/schedules/${scheduleId}?edit=1`)
                .set('cookie', setCookie)
                .send({
                  scheduleName: 'テスト更新予定2',
                  memo: 'テスト更新メモ2',
                  candidates: 'テスト更新候補2',
                  _csrf: csrf,
                })
                .end((err, res) => {
                  Schedule.findByPk(scheduleId).then((s) => {
                    assert.deepStrictEqual(s.scheduleName, 'テスト更新予定2');
                    assert.deepStrictEqual(s.memo, 'テスト更新メモ2');
                  });
                  Candidate.findAll({
                    where: { scheduleId: scheduleId },
                    order: [['candidateId', 'ASC']],
                  }).then((candidates) => {
                    assert.deepStrictEqual(candidates.length, 2);
                    assert.deepStrictEqual(
                      candidates[0].candidateName,
                      'テスト更新候補1'
                    );
                    assert.deepStrictEqual(
                      candidates[1].candidateName,
                      'テスト更新候補2'
                    );
                    deleteScheduleAggregate(scheduleId, done, err);
                  });
                });
            });
        });
    });
  });
});

describe('/schedules/:scheduleId?delete=1', () => {
  beforeAll(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });

  afterAll(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  test('予定に関連する全ての情報が削除できる', (done) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .get('/schedules/new')
        .end((err, res) => {
          const match = res.text.match(
            /<input type="hidden" name="_csrf" value="(.*?)">/
          );
          const csrf = match[1];
          const setCookie = res.headers['set-cookie'];

          request(app)
            .post('/schedules')
            .set('cookie', setCookie)
            .send({
              scheduleName: 'テスト更新予定1',
              memo: 'テスト更新メモ1',
              candidates: 'テスト更新候補1',
              _csrf: csrf,
            })
            .end((err, res) => {
              const createdSchedulePath = res.headers.location;
              const scheduleId = createdSchedulePath.split('/schedules/')[1];

              // 出欠作成
              const promiseAvailability = Candidate.findOne({
                where: { scheduleId: scheduleId },
              }).then((candidate) => {
                return new Promise((resolve) => {
                  request(app)
                    .post(`/schedules/${scheduleId}/users/${0}/candidates/${candidate.candidateId}`)
                    .set('cookie', setCookie)
                    .send({ availability: 2 }) // 出席に更新
                    .end((err, res) => {
                      if (err) done(err);
                      resolve();
                    });
                });
              });

              // コメント作成
              const promiseComment = new Promise((resolve) => {
                request(app)
                  .post(`/schedules/${scheduleId}/users/${0}/comments`)
                  .set('cookie', setCookie)
                  .send({ comment: 'testcomment' })
                  .expect('{"status":"OK","comment":"testcomment"}')
                  .end((err, res) => {
                    if (err) done(err);
                    resolve();
                  });
              });

              // 削除
              const promiseDeleted = Promise.all([
                promiseAvailability,
                promiseComment,
              ]).then(() => {
                return new Promise((resolve) => {
                  request(app)
                    .post(`/schedules/${scheduleId}?delete=1`)
                    .set('cookie', setCookie)
                    .send({ _csrf: csrf })
                    .end((err, res) => {
                      if (err) done(err);
                      resolve();
                    });
                });
              });

              // テスト
              promiseDeleted.then(() => {
                const p1 = Comment.findAll({
                  where: { scheduleId: scheduleId },
                }).then((comments) => {
                  assert.deepStrictEqual(comments.length, 0);
                });
                const p2 = Availability.findAll({
                  where: { scheduleId: scheduleId },
                }).then((availabilities) => {
                  assert.deepStrictEqual(availabilities.length, 0);
                });
                const p3 = Candidate.findAll({
                  where: { scheduleId: scheduleId },
                }).then((candidates) => {
                  assert.deepStrictEqual(candidates.length, 0);
                });
                const p4 = Schedule.findByPk(scheduleId).then((schedule) => {
                  assert.deepStrictEqual(!schedule, true);
                });
                Promise.all([p1, p2, p3, p4]).then(() => {
                  if (err) return done(err);
                  done();
                });
              });
            });
        });
    });
  });
});
