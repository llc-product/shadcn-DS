---
"@digitaltwin/i18n": minor
---

Add the six strings three components were rendering with no translation behind them: `carousel`
(the two arrow labels), `combobox` (trigger placeholder, search placeholder, empty text) and
`datePicker` (its placeholder). Each in all four locales.

The package is a list of the English defaults components ship so an app does not have to rediscover
them, and it was only useful if complete. It was not: those three grew a replaceable default and
none was added here, while every existing test stayed green — they compare the locales to each
other, never to the components.

A test now reads the component sources and asserts that any component shipping a default string has
a namespace here. It fails on a missing one, which was verified by removing `carousel` and watching
it go red.
