# jstf

An API wrapper for some TF2-related sites. Created by [manic](http://manic.tf/). Visit the original python version [here](https://github.com/mninc/pytf).

These methods are designed so I can use this module rather than pasting functions into many blocks of code. It is not intended to be an API wrapper for every tf2 site. If you want to add some methods, feel free to make a pull request.

## Installation
`npm install jstf --save`

## Usage

Initialise a jstf Manager object that can be used for all backpack.tf methods:
```js
const jstf = require("jstf");

let manager = new jstf.Manager("backpack.tf api key");
manager.bpGetUserToken().then(function(){
    // your code here
});

```
