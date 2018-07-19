# kMap

[![Build Status](https://travis-ci.org/kalisio/kMap.png?branch=master)](https://travis-ci.org/kalisio/kMap)
[![Code Climate](https://codeclimate.com/github/kalisio/kMap/badges/gpa.svg)](https://codeclimate.com/github/kalisio/kMap)
[![Test Coverage](https://codeclimate.com/github/kalisio/kMap/badges/coverage.svg)](https://codeclimate.com/github/kalisio/kMap/coverage)
[![Dependency Status](https://img.shields.io/david/kalisio/kMap.svg?style=flat-square)](https://david-dm.org/kalisio/kMap)
[![Documentation](https://img.shields.io/badge/documentation-available-brightgreen.svg)](https://kalisio.gitbooks.io/kalisio/api)
[![Known Vulnerabilities](https://snyk.io/test/github/kalisio/kMap/badge.svg)](https://snyk.io/test/github/kalisio/kMap)

> Basic utils to provide mapping capabilities for Kalisio applications and services

## Installation

```
npm install kMap --save
// Or with Yarn
yarn add kMap
```

## Required service operations

If a organisation owner subscribe to a paid plan what should be done:
1. add a stripe payment method (i.e. card) if none already provided
  * redirection on a specific form on the client > direct call to the billing service
2. create the stripe customer if not already done
3. subscribe the organisation to the new paid plan

If a organisation owner subscribe to a free plan what should be done:
1. unsubscribe the organisation to the old paid plan

When a organisation is destroyed:
1. remove the stripe customer > hook calling the billing service

## Documentation

The [kDocs](https://kalisio.gitbooks.io/kalisio/) are loaded with awesome stuff and tell you everything you need to know about using and configuring it.

## License

Copyright (c) 2017 Kalisio

Licensed under the [MIT license](LICENSE).
