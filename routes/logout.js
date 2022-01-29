'use strict';
const express = require('express');
const Router = require('express-promise-router');
const router = Router();

router.get('/', (req, res, next) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
