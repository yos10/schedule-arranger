'use strict';
const express = require('express');
const Router = require('express-promise-router');
const router = Router();

router.get('/', (req, res, next) => {
  const from = req.query.from;
  if (from) {
    res.cookie('loginFrom', from, { expires: new Date(Date.now() + 600000)});
  }
  res.render('login');
});

module.exports = router;
