;(function(root, undefined) {
  'use strict';

  /** Method and object shortcuts */
  var phantom = root.phantom,
      amd = root.define && define.amd,
      document = !phantom && root.document,
      body = document && document.body,
      create = Object.create,
      freeze = Object.freeze,
      params = root.arguments,
      process = root.process,
      push = Array.prototype.push,
      slice = Array.prototype.slice,
      system = root.system,
      toString = Object.prototype.toString,
      Worker = document && root.Worker;

  /** The file path of the Lo-Dash file to test */
  var filePath = (function() {
    var min = 0,
        result = [];

    if (phantom) {
      result = params = phantom.args;
    } else if (system) {
      min = 1;
      result = params = system.args;
    } else if (process) {
      min = 2;
      result = params = process.argv;
    } else if (params) {
      result = params;
    }
    var last = result[result.length - 1];
    result = (result.length > min && !/test(?:\.js)?$/.test(last)) ? last : '../lodash.js';

    try {
      if (!amd) {
        return require('fs').realpathSync(result);
      }
    } catch(e) { }

    return result;
  }());

  /** The `ui` object */
  var ui = root.ui || (root.ui = {
    'buildPath': filePath,
    'loaderPath': '',
    'urlParams': {}
  });

  /** The basename of the Lo-Dash file to test */
  var basename = /[\w.-]+$/.exec(filePath)[0];

  /** Used to indicate testing a modularized build */
  var isModularize = ui.isModularize || /\b(?:commonjs|(index|main)\.js|lodash-(?:amd|node)|modularize|npm)\b/.test([ui.buildPath, ui.urlParams.build, basename]);

  /** Detect if testing `npm` modules */
  var isNpm = isModularize && /\bnpm\b/.test([ui.buildPath, ui.urlParams.build]);

  /** Detects if running in a PhantomJS web page */
  var isPhantomPage = typeof callPhantom == 'function';

  /** Detect if running in Rhino */
  var isRhino = root.java && typeof global == 'function' && global().Array === root.Array;

  /** Use a single "load" function */
  var load = !amd && typeof require == 'function' ? require : root.load;

  /** The unit testing framework */
  var QUnit = (function() {
    var noop = Function.prototype;
    return  root.QUnit || (
      root.addEventListener || (root.addEventListener = noop),
      root.setTimeout || (root.setTimeout = noop),
      root.QUnit = load('../vendor/qunit/qunit/qunit.js') || root.QUnit,
      (load('../vendor/qunit-clib/qunit-clib.js') || { 'runInContext': noop }).runInContext(root),
      addEventListener === noop && delete root.addEventListener,
      root.QUnit
    );
  }());

  /*--------------------------------------------------------------------------*/

  // log params passed to `test.js`
  if (params) {
    console.log('test.js invoked with arguments: ' + JSON.stringify(slice.call(params)));
  }
  // exit early if going to run tests in a PhantomJS web page
  if (phantom && isModularize) {
    var page = require('webpage').create();
    page.open(filePath, function(status) {
      if (status != 'success') {
        console.log('PhantomJS failed to load page: ' + filePath);
        phantom.exit(1);
      }
    });

    page.onCallback = function(details) {
      phantom.exit(details.failed ? 1 : 0);
    };

    page.onConsoleMessage = function(message) {
      console.log(message);
    };

    page.onInitialized = function() {
      page.evaluate(function() {
        document.addEventListener('DOMContentLoaded', function() {
          var xhr = new XMLHttpRequest;
          xhr.open('get', '../vendor/qunit-clib/qunit-clib.js');
          xhr.onload = function() {
            var script = document.createElement('script');
            script.text = xhr.responseText;
            document.head.appendChild(script);
            QUnit.done(callPhantom);
          };

          xhr.send(null);
        });
      });
    };

    return;
  }

  /*--------------------------------------------------------------------------*/

  /** The `lodash` function to test */
  var _ = root._ || (root._ = (
    _ = load(filePath) || root._,
    _ = _._ || _,
    (_.runInContext ? _.runInContext(root) : _)
  ));

  /** Used to pass falsey values to methods */
  var falsey = [, '', 0, false, NaN, null, undefined];

  /** Used to pass empty values to methods */
  var empties = [[], {}].concat(falsey.slice(1));

  /** Used as the size when optimizations are enabled for large arrays */
  var largeArraySize = 75;

  /** Used to set property descriptors */
  var defineProperty = (function() {
    try {
      var o = {},
          func = Object.defineProperty,
          result = func(o, o, o) && func;
    } catch(e) { }
    return result;
  }());

  /** Used to check problem JScript properties (a.k.a. the [[DontEnum]] bug) */
  var shadowedProps = [
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    'toString',
    'valueOf'
  ];

  /** Used to check problem JScript properties too */
  var shadowedObject = _.invert(shadowedProps);

  /**
   * Skips a given number of tests with a passing result.
   *
   * @private
   * @param {number} [count=1] The number of tests to skip.
   */
  function skipTest(count) {
    count || (count = 1);
    while (count--) {
      ok(true, 'test skipped');
    }
  }

  /*--------------------------------------------------------------------------*/

  // add object from iframe
  (function() {
    if (!document) {
      return;
    }
    var iframe = document.createElement('iframe');
    iframe.frameBorder = iframe.height = iframe.width = 0;
    body.appendChild(iframe);

    var idoc = (idoc = iframe.contentDocument || iframe.contentWindow).document || idoc;
    idoc.write("<script>parent._._object = { 'a': 1, 'b': 2, 'c': 3 };<\/script>");
    idoc.close();
  }());

  // add web worker
  (function() {
    if (!Worker || isModularize) {
      return;
    }
    var worker = new Worker('./asset/worker.js?t=' + (+new Date));
    worker.addEventListener('message', function(e) {
      _._VERSION = e.data || '';
    }, false);

    worker.postMessage(ui.buildPath);
  }());

  /*--------------------------------------------------------------------------*/

  // explicitly call `QUnit.module()` instead of `module()`
  // in case we are in a CLI environment
  QUnit.module(basename);

  (function() {
    test('supports loading ' + basename + ' as the "lodash" module', 1, function() {
      if (amd) {
        equal((lodashModule || {}).moduleName, 'lodash');
      } else {
        skipTest();
      }
    });

    test('supports loading ' + basename + ' with the Require.js "shim" configuration option', 1, function() {
      if (amd && /requirejs/.test(ui.loaderPath)) {
        equal((shimmedModule || {}).moduleName, 'shimmed');
      } else {
        skipTest();
      }
    });

    test('supports loading ' + basename + ' as the "underscore" module', 1, function() {
      if (amd && !/dojo/.test(ui.loaderPath)) {
        equal((underscoreModule || {}).moduleName, 'underscore');
      } else {
        skipTest();
      }
    });

    asyncTest('supports loading ' + basename + ' in a web worker', 1, function() {
      if (Worker && !isModularize) {
        var limit = 1000,
            start = new Date;

        var attempt = function() {
          var actual = _._VERSION;
          if ((new Date - start) < limit && typeof actual != 'string') {
            setTimeout(attempt, 16);
            return;
          }
          equal(actual, _.VERSION);
          QUnit.start();
        };

        attempt();
      }
      else {
        skipTest();
        QUnit.start();
      }
    });

    test('avoids overwritten native methods', 4, function() {
      function message(methodName) {
        return '`_.' + methodName + '` should avoid overwritten native methods';
      }

      var object = { 'a': true };

      if (document) {
        try {
          var actual = lodashBadShim.bind(function() { return this.a; }, object)();
        } catch(e) {
          actual = null;
        }
        ok(actual, message('bind'));

        try {
          actual = lodashBadShim.isArray([]);
        } catch(e) {
          actual = null;
        }
        ok(actual, message('isArray'));

        try {
          actual = lodashBadShim.keys(object);
        } catch(e) {
          actual = null;
        }
        deepEqual(actual, ['a'], message('keys'));

        try {
          var Foo = function() {
            this.a = 2;
          };

          var actual = _.transform(new Foo, function(result, value, key) {
            result[key] = value * value;
          });
        } catch(e) {
          actual = null;
        }
        ok(actual instanceof Foo, message('transform'));
      }
      else {
        skipTest(4);
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash constructor');

  (function() {
    test('creates a new instance when called without the `new` operator', 1, function() {
      ok(_() instanceof _);
    });

    test('should return provided `lodash` instances', 1,function() {
      var wrapped = _(false);
      equal(_(wrapped), wrapped);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.after');

  (function() {
    test('should create a function that executes `func` after `n` calls', 4, function() {
      function after(n, times) {
        var count = 0;
        _.times(times, _.after(n, function() { count++; }));
        return count;
      }

      strictEqual(after(5, 5), 1, 'after(n) should execute `func` after being called `n` times');
      strictEqual(after(5, 4), 0, 'after(n) should not execute `func` unless called `n` times');
      strictEqual(after(0, 0), 0, 'after(0) should not execute `func` immediately');
      strictEqual(after(0, 1), 1, 'after(0) should execute `func` when called once');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.assign');

  (function() {
    test('should not error on `null` or `undefined` sources (test in IE < 9)', 1, function() {
      try {
        deepEqual(_.assign({}, null, undefined, { 'a': 1 }), { 'a': 1 });
      } catch(e) {
        ok(false);
      }
    });

    test('should be aliased', 1, function() {
      strictEqual(_.extend, _.assign);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.at');

  (function() {
    var args = arguments;

    test('should return `undefined` for nonexistent keys', 1, function() {
      var actual = _.at(['a', 'b',  'c'], [0, 2, 4]);
      deepEqual(actual, ['a', 'c', undefined]);
    });

    test('should return an empty array when no keys are provided', 1, function() {
      deepEqual(_.at(['a', 'b', 'c']), []);
    });

    test('should accept multiple key arguments', 1, function() {
      var actual = _.at(['a', 'b', 'c', 'd'], 0, 2, 3);
      deepEqual(actual, ['a', 'c', 'd']);
    });

    test('should work with an `arguments` object for `collection`', 1, function() {
      var actual = _.at(args, [0, 2]);
      deepEqual(actual, ['a', 'c']);
    });

    test('should work with an object for `collection`', 1, function() {
      var actual = _.at({ 'a': 1, 'b': 2, 'c': 3 }, ['a', 'c']);
      deepEqual(actual, [1, 3]);
    });

    test('should work when used as `callback` for `_.map`', 1, function() {
      var array = [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          actual = _.map(array, _.at);

      deepEqual(actual, [[1], [5], [9]]);
    });

    _.forEach({
      'literal': 'abc',
      'object': Object('abc')
    },
    function(collection, key) {
      test('should work with a string ' + key + ' for `collection`', 1, function() {
        deepEqual(_.at(collection, [0, 2]), ['a', 'c']);
      });
    });
  }('a', 'b', 'c'));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.bind');

  (function() {
    function func() {
      var args = [this];
      push.apply(args, arguments);
      return args;
    }

    test('should bind a function to an object', 1, function() {
      var object = {},
          bound = _.bind(func, object);

      deepEqual(bound('a'), [object, 'a']);
    });

    test('should accept a falsey `thisArg` argument', 1, function() {
      var actual = [],
          values = falsey.slice(1),
          expected = _.map(values, function(value) { return [value]; });

      _.forEach(values, function(value, index) {
        try {
          var bound = _.bind(func, value);
          actual.push(bound());
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should bind a function to `null` or `undefined`', 2, function() {
      var bound = _.bind(func, null);
      deepEqual(bound('a'), [null, 'a']);

      bound = _.bind(func, undefined);
      deepEqual(bound('b'), [undefined, 'b']);
    });

    test('should partially apply arguments ', 4, function() {
      var object = {},
          bound = _.bind(func, object, 'a');

      deepEqual(bound(), [object, 'a']);

      bound = _.bind(func, object, 'a');
      deepEqual(bound('b'), [object, 'a', 'b']);

      bound = _.bind(func, object, 'a', 'b');
      deepEqual(bound(), [object, 'a', 'b']);
      deepEqual(bound('c', 'd'), [object, 'a', 'b', 'c', 'd']);
    });

    test('should ignore binding when called with the `new` operator', 3, function() {
      function Foo() {
        return this;
      }

      var bound = _.bind(Foo, { 'a': 1 }),
          newBound = new bound;

      strictEqual(newBound.a, undefined);
      strictEqual(bound().a, 1);
      ok(newBound instanceof Foo);
    });

    test('should append array arguments to partially applied arguments (test in IE < 9)', 1, function() {
      var object = {},
          bound = _.bind(func, object, 'a');

      deepEqual(bound(['b'], 'c'), [object, 'a', ['b'], 'c']);
    });

    test('ensure `new bound` is an instance of `func`', 1, function() {
      var func = function() {},
          bound = _.bind(func, {});

      ok(new bound instanceof func);
    });

    test('should throw a TypeError if `func` is not a function', 1, function() {
      raises(function() { _.bind(); }, TypeError);
    });

    test('should return a wrapped value when chaining', 2, function() {
      if (!isNpm) {
        var object = {},
            bound = _(func).bind({}, 'a', 'b');

        ok(bound instanceof _);

        var actual = bound.value()('c');
        deepEqual(actual, [object, 'a', 'b', 'c']);
      }
      else {
        skipTest(2);
      }
    });

    test('should rebind functions correctly', 3, function() {
      var object1 = {},
          object2 = {},
          object3 = {};

      var bound1 = _.bind(func, object1),
          bound2 = _.bind(bound1, object2, 'a'),
          bound3 = _.bind(bound1, object3, 'b');

      deepEqual(bound1(), [object1]);
      deepEqual(bound2(), [object1, 'a']);
      deepEqual(bound3(), [object1, 'b']);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.bindAll');

  (function() {
    var args = arguments;

    test('should bind all methods of `object`', 1, function() {
      function Foo() {
        this._a = 1;
        this._b = 2;
        this.a = function() { return this._a; };
      };

      Foo.prototype.b = function() { return this._b; };

      var object = new Foo;
      _.bindAll(object);

      var actual = _.map(_.functions(object), function(methodName) {
        return object[methodName].call({});
      });

      deepEqual(actual, [1, 2]);
    });

    test('should accept individual method names', 1, function() {
      var object = {
        '_a': 1,
        '_b': 2,
        '_c': 3,
        'a': function() { return this._a; },
        'b': function() { return this._b; },
        'c': function() { return this._c; }
      };

      _.bindAll(object, 'a', 'b');

      var actual = _.map(_.functions(object), function(methodName) {
        return object[methodName].call({});
      });

      deepEqual(actual, [1, 2, undefined]);
    });

    test('should accept arrays of method names', 1, function() {
      var object = {
        '_a': 1,
        '_b': 2,
        '_c': 3,
        '_d': 4,
        'a': function() { return this._a; },
        'b': function() { return this._b; },
        'c': function() { return this._c; },
        'd': function() { return this._d; }
      };

      _.bindAll(object, ['a', 'b'], ['c']);

      var actual = _.map(_.functions(object), function(methodName) {
        return object[methodName].call({});
      });

      deepEqual(actual, [1, 2, 3, undefined]);
    });

    test('should work with an array `object` argument', 1, function() {
      var array = ['push', 'pop'];
      _.bindAll(array);
      strictEqual(array.pop, Array.prototype.pop);
    });

    test('should work with `arguments` objects as secondary arguments', 1, function() {
      var object = {
        '_a': 1,
        'a': function() { return this._a; }
      };

      _.bindAll(object, args);

      var actual = _.map(_.functions(object), function(methodName) {
        return object[methodName].call({});
      });

      deepEqual(actual, [1]);
    });
  }('a'));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.bindKey');

  (function() {
    test('should work when the target function is overwritten', 2, function() {
      var object = {
        'name': 'fred',
        'greet': function(greeting) {
          return greeting + ' ' + this.name;
        }
      };

      var func = _.bindKey(object, 'greet', 'hi');
      equal(func(), 'hi fred');

      object.greet = function(greeting) {
        return greeting + ' ' + this.name + '!';
      };
      equal(func(), 'hi fred!');
    });
  }());


  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.chain');

  (function() {
    test('should return a wrapped value', 1, function() {
      if (!isNpm) {
        var actual = _.chain({ 'a': 0 });
        ok(actual instanceof _);
      }
      else {
        skipTest();
      }
    });

    test('should return the existing wrapper when chaining', 1, function() {
      if (!isNpm) {
        var wrapper = _({ 'a': 0 });
        equal(wrapper.chain(), wrapper);
      }
      else {
        skipTest();
      }
    });

    test('should enable chaining of methods that return unwrapped values by default', 6, function() {
      if (!isNpm) {
        var array = ['c', 'b', 'a'];

        ok(_.chain(array).first() instanceof _);
        ok(_(array).chain().first() instanceof _);

        ok(_.chain(array).isArray() instanceof _);
        ok(_(array).chain().isArray() instanceof _);

        ok(_.chain(array).sortBy().first() instanceof _);
        ok(_(array).chain().sortBy().first() instanceof _);
      }
      else {
        skipTest(6);
      }
    });

    test('should chain multiple methods', 6, function() {
      if (!isNpm) {
        _.times(2, function(index) {
          var array = ['one two three four', 'five six seven eight', 'nine ten eleven twelve'],
              expected = { ' ': 9, 'e': 14, 'f': 2, 'g': 1, 'h': 2, 'i': 4, 'l': 2, 'n': 6, 'o': 3, 'r': 2, 's': 2, 't': 5, 'u': 1, 'v': 4, 'w': 2, 'x': 1 },
              wrapper = index ? _(array).chain() : _.chain(array);

          var actual = wrapper
            .chain()
            .map(function(value) { return value.split(''); })
            .flatten()
            .reduce(function(object, chr) {
              object[chr] || (object[chr] = 0);
              object[chr]++;
              return object;
            }, {})
            .value();

          deepEqual(actual, expected);

          array = [1, 2, 3, 4, 5, 6];
          wrapper = index ? _(array).chain() : _.chain(array);
          actual = wrapper
            .chain()
            .filter(function(n) { return n % 2; })
            .reject(function(n) { return n % 3 == 0; })
            .sortBy(function(n) { return -n; })
            .value();

          deepEqual(actual, [5, 1]);

          array = [3, 4];
          wrapper = index ? _(array).chain() : _.chain(array);
          actual = wrapper
            .reverse()
            .concat([2, 1])
            .unshift(5)
            .tap(function(value) { value.pop(); })
            .map(function(n) { return n * n; })
            .value();

          deepEqual(actual,[25, 16, 9, 4]);
        });
      }
      else {
        skipTest(6);
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('cloning');

  (function() {
    function Klass() { this.a = 1; }
    Klass.prototype = { 'b': 1 };

    var nonCloneable = {
      'an element': body,
      'a function': Klass
    };

    var objects = {
      'an `arguments` object': arguments,
      'an array': ['a', 'b', 'c', ''],
      'an array-like-object': { '0': 'a', '1': 'b', '2': 'c',  '3': '', 'length': 5 },
      'boolean': false,
      'boolean object': Object(false),
      'a Klass instance': new Klass,
      'an object': { 'a': 0, 'b': 1, 'c': 3 },
      'an object with object values': { 'a': /a/, 'b': ['B'], 'c': { 'C': 1 } },
      'an object from another document': _._object || {},
      'null': null,
      'a number': 3,
      'a number object': Object(3),
      'a regexp': /a/gim,
      'a string': 'a',
      'a string object': Object('a'),
      'undefined': undefined
    };

    objects['an array'].length = 5;

    test('`_.clone` should shallow clone by default', 2, function() {
      var expected = [{ 'a': 0 }, { 'b': 1 }],
          actual = _.clone(expected);

      deepEqual(actual, expected);
      ok(actual != expected && actual[0] === expected[0]);
    });

    test('`_.clone` should perform a shallow clone when used as `callback` for `_.map`', 1, function() {
      var expected = [{ 'a': [0] }, { 'b': [1] }],
          actual = _.map(expected, _.clone);

      ok(actual[0] != expected[0] && actual[0].a === expected[0].a && actual[1].b === expected[1].b);
    });

    test('`_.cloneDeep` should deep clone objects with circular references', 1, function() {
      var object = {
        'foo': { 'b': { 'foo': { 'c': { } } } },
        'bar': { }
      };

      object.foo.b.foo.c = object;
      object.bar.b = object.foo.b;

      var clone = _.cloneDeep(object);
      ok(clone.bar.b === clone.foo.b && clone === clone.foo.b.foo.c && clone !== object);
    });

    _.forEach([
      'clone',
      'cloneDeep'
    ],
    function(methodName) {
      var func = _[methodName],
          klass = new Klass;

      _.forOwn(objects, function(object, key) {
        test('`_.' + methodName + '` should clone ' + key, 2, function() {
          var clone = func(object);
          strictEqual(_.isEqual(object, clone), true);

          if (_.isObject(object)) {
            notStrictEqual(clone, object);
          } else {
            strictEqual(clone, object);
          }
        });
      });

      _.forOwn(nonCloneable, function(object, key) {
        test('`_.' + methodName + '` should not clone ' + key, 1, function() {
          strictEqual(func(object), object);
        });
      });

      test('`_.' + methodName + '` should clone problem JScript properties (test in IE < 9)', 2, function() {
        deepEqual(func(shadowedObject), shadowedObject);
        notStrictEqual(func(shadowedObject), shadowedObject);
      });

      test('`_.' + methodName + '` should pass the correct `callback` arguments', 1, function() {
        var args;

        func(klass, function() {
          args || (args = slice.call(arguments));
        });

        deepEqual(args, [klass]);
      });

      test('`_.' + methodName + '`should support the `thisArg` argument', 1, function() {
        var actual = func('a', function(value) {
          return this[value];
        }, { 'a': 'A' });

        equal(actual, 'A');
      });

      test('`_.' + methodName + '` should handle cloning if `callback` returns `undefined`', 1, function() {
        var actual = func({ 'a': { 'b': 'c' } }, function() {});
        deepEqual(actual, { 'a': { 'b': 'c' } });
      });

      test('`_.' + methodName + '` should deep clone `index` and `input` array properties', 2, function() {
        var array = /x/.exec('vwxyz'),
            actual = func(array);

        strictEqual(actual.index, 2);
        equal(actual.input, 'vwxyz');
      });

      test('`_.' + methodName + '` should deep clone `lastIndex` regexp property', 1, function() {
        // avoid a regexp literal for older Opera and use `exec` for older Safari
        var regexp = RegExp('x', 'g');
        regexp.exec('vwxyz');

        var actual = func(regexp);
        equal(actual.lastIndex, 3);
      });
    })
  }(1, 2, 3));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.compact');

  (function() {
    test('should filter falsey values', 1, function() {
      var array = ['0', '1', '2'];
      deepEqual(_.compact(falsey.concat(array)), array);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.compose');

  (function() {
    test('should create a function that is the composition of the provided functions', 1, function() {
      var realNameMap = {
        'pebbles': 'penelope'
      };

      var format = function(name) {
        name = realNameMap[name.toLowerCase()] || name;
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      };

      var greet = function(formatted) {
        return 'Hiya ' + formatted + '!';
      };

      var welcome = _.compose(greet, format);
      equal(welcome('pebbles'), 'Hiya Penelope!');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.contains');

  (function() {
    _.forEach({
      'an `arguments` object': arguments,
      'an array': [1, 2, 3, 1, 2, 3],
      'an object': { 'a': 1, 'b': 2, 'c': 3, 'd': 1, 'e': 2, 'f': 3 },
      'a string': '123123'
    },
    function(collection, key) {
      test('should work with ' + key + ' and  return `true` for  matched values', 1, function() {
        strictEqual(_.contains(collection, 3), true);
      });

      test('should work with ' + key + ' and  return `false` for unmatched values', 1, function() {
        strictEqual(_.contains(collection, 4), false);
      });

      test('should work with ' + key + ' and a positive `fromIndex`', 1, function() {
        strictEqual(_.contains(collection, 1, 2), true);
      });

      test('should work with ' + key + ' and a `fromIndex` >= collection\'s length', 4, function() {
        strictEqual(_.contains(collection, 1, 6), false);
        strictEqual(_.contains(collection, undefined, 6), false);
        strictEqual(_.contains(collection, 1, 8), false);
        strictEqual(_.contains(collection, undefined, 8), false);
      });

      test('should work with ' + key + ' and a negative `fromIndex`', 1, function() {
        strictEqual(_.contains(collection, 2, -3), true);
      });

      test('should work with ' + key + ' and a negative `fromIndex` <= negative collection\'s length', 2, function() {
        strictEqual(_.contains(collection, 1, -6), true);
        strictEqual(_.contains(collection, 2, -8), true);
      });

      test('should work with ' + key + ' and return an unwrapped value when chaining', 1, function() {
        if (!isNpm) {
          strictEqual(_(collection).contains(3), true);
        }
        else {
          skipTest();
        }
      });
    });

    _.forEach({
      'literal': 'abc',
      'object': Object('abc')
    },
    function(collection, key) {
      test('should work with a string ' + key + ' for `collection`', 2, function() {
        strictEqual(_.contains(collection, 'bc'), true);
        strictEqual(_.contains(collection, 'd'), false);
      });
    });

    test('should be aliased', 1, function() {
      strictEqual(_.include, _.contains);
    });
  }(1, 2, 3, 1, 2, 3));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.countBy');

  (function() {
    var array = [4.2, 6.1, 6.4];

    test('should work with a `callback`', 1, function() {
      var actual = _.countBy(array, function(num) {
        return Math.floor(num);
      }, Math);

      deepEqual(actual, { '4': 1, '6': 2 });
    });

    test('should use `_.identity` when no `callback` is provided', 1, function() {
      var actual = _.countBy([4, 6, 6]);
      deepEqual(actual, { '4': 1, '6':  2 });
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.countBy(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [4.2, 0, array]);
    });

    test('should support the `thisArg` argument', 1, function() {
      var actual = _.countBy(array, function(num) {
        return this.floor(num);
      }, Math);

      deepEqual(actual, { '4': 1, '6': 2 });
    });

    test('should only add values to own, not inherited, properties', 2, function() {
      var actual = _.countBy([4.2, 6.1, 6.4], function(num) {
        return Math.floor(num) > 4 ? 'hasOwnProperty' : 'constructor';
      });

      deepEqual(actual.constructor, 1);
      deepEqual(actual.hasOwnProperty, 2);
    });

    test('should work with a string for `callback`', 1, function() {
      var actual = _.countBy(['one', 'two', 'three'], 'length');
      deepEqual(actual, { '3': 2, '5': 1 });
    });

    test('should work with an object for `collection`', 1, function() {
      var actual = _.countBy({ 'a': 4.2, 'b': 6.1, 'c': 6.4 }, function(num) {
        return Math.floor(num);
      });

      deepEqual(actual, { '4': 1, '6': 2 });
    });

    test('should work with a number for `callback`', 2, function() {
      var array = [
        [1, 'a'],
        [2, 'a'],
        [2, 'b']
      ];

      deepEqual(_.countBy(array, 0), { '1': 1, '2': 2 });
      deepEqual(_.countBy(array, 1), { 'a': 2, 'b': 1 });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.create');

  (function() {
    test('should create an object that inherits from the given `prototype` object', 3, function() {
      function Shape() {
        this.x = 0;
        this.y = 0;
      }

      function Circle() {
        Shape.call(this);
      }

      Circle.prototype = _.create(Shape.prototype);
      Circle.prototype.constructor = Circle;

      var actual = new Circle;

      ok(actual instanceof Circle);
      ok(actual instanceof Shape);
      notStrictEqual(Circle.prototype, Shape.prototype);
    });

    test('should assign `properties` to the created object', 3, function() {
      function Shape() {
        this.x = 0;
        this.y = 0;
      }

      function Circle() {
        Shape.call(this);
      }

      var expected = { 'constructor': Circle, 'radius': 0 };
      Circle.prototype = _.create(Shape.prototype, expected);

      var actual = new Circle;

      ok(actual instanceof Circle);
      ok(actual instanceof Shape);
      deepEqual(Circle.prototype, expected);
    });

    test('should accept a falsey `prototype` argument', 1, function() {
      var actual = [],
          expected = _.map(falsey, function() { return {}; });

      _.forEach(falsey, function(value, index) {
        actual.push(index ? _.create(value) : _.create());
      });

      deepEqual(actual, expected);
    });

    test('should ignore primitive `prototype` arguments and use an empty object instead', 1, function() {
      var actual = [],
          primitives = [1, true, 'a'],
          expected = _.map(primitives, function() { return true; });

      _.forEach(primitives, function(value, index) {
        actual.push(_.isPlainObject(index ? _.create(value) : _.create()));
      });

      deepEqual(actual, expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.createCallback');

  (function() {
    test('should work with functions created by `_.partial` and `_.partialRight`', 2, function() {
      function func() {
        var result = [this.x];
        push.apply(result, arguments);
        return result;
      }
      var expected = [1, 2, 3],
          object = { 'x': 1 },
          callback = _.createCallback(_.partial(func, 2), object);

      deepEqual(callback(3), expected);

      callback = _.createCallback(_.partialRight(func, 3), object);
      deepEqual(callback(2), expected);
    });

    test('should work without an `argCount`', 1, function() {
      var args,
          expected = ['a', 'b', 'c', 'd', 'e'];

      var callback = _.createCallback(function() {
        args = slice.call(arguments);
      });

      callback.apply(null, expected);
      deepEqual(args, expected);
    });

    test('should return the function provided if already bound with `Function#bind`', 1, function() {
      function a() {}

      if (Function.prototype.bind) {
        var bound = a.bind();
        strictEqual(_.createCallback(bound, {}), bound);
      }
      else {
        skipTest();
      }
    });

    test('should return the function provided when there is no `this` reference', 2, function() {
      function a() {}
      function b() { return this.b; }

      if (_.support.funcDecomp) {
        strictEqual(_.createCallback(a, {}), a);
        notStrictEqual(_.createCallback(b, {}), b);
      }
      else {
        skipTest(2);
      }
    });

    test('should only write `__bindData__` to named functions', 2, function() {
      function a() {};
      var b = function() {};

      if (_.support.funcNames || _.support.funcDecomp) {
        _.createCallback(a, {});
        ok('__bindData__' in a)

        _.createCallback(b, {});
        ok(!('__bindData__' in b));
      }
      else {
        skipTest(2);
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.curry');

  (function() {
    test('should curry based on the number of arguments provided', 3, function() {
      function func(a, b, c) {
        return a + b + c;
      }

      var curried = _.curry(func);

      equal(curried(1)(2)(3), 6);
      equal(curried(1, 2)(3), 6);
      equal(curried(1, 2, 3), 6);
    });

    test('should work with partial methods', 2, function() {
      function func(a, b, c) {
        return a + b + c;
      }

      var curried = _.curry(func),
          a = _.partial(curried, 1),
          b = _.partialRight(a, 3),
          c = _.partialRight(a(2), 3);

      equal(b(2), 6);
      equal(c(), 6);
    });

    test('should not alter the `this` binding', 9, function() {
      function func(a, b, c) {
        var value = this || {};
        return value[a] + value[b] + value[c];
      }

      var object = { 'a': 1, 'b': 2, 'c': 3 };

      equal(_.curry(_.bind(func, object), 3)('a')('b')('c'), 6);
      equal(_.curry(_.bind(func, object), 3)('a', 'b')('c'), 6);
      equal(_.curry(_.bind(func, object), 3)('a', 'b', 'c'), 6);

      ok(_.isEqual(_.bind(_.curry(func), object)('a')('b')('c'), NaN));
      ok(_.isEqual(_.bind(_.curry(func), object)('a', 'b')('c'), NaN));
      equal(_.bind(_.curry(func), object)('a', 'b', 'c'), 6);

      object.func = _.curry(func);

      ok(_.isEqual(object.func('a')('b')('c'), NaN));
      ok(_.isEqual(object.func('a', 'b')('c'), NaN));
      equal(object.func('a', 'b', 'c'), 6);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.debounce');

  (function() {
    asyncTest('should debounce a function', 2, function() {
      if (!(isRhino && isModularize)) {
        var count = 0;
        var debounced = _.debounce(function() { count++; }, 32);

        debounced();
        debounced();
        debounced();

        equal(count, 0);

        setTimeout(function() {
          equal(count, 1);
          QUnit.start();
        }, 64);
      }
      else {
        skipTest(2);
      }
    });

    asyncTest('subsequent debounced calls return the last `func` result',2, function() {
      if (!(isRhino && isModularize)) {
        var debounced = _.debounce(_.identity, 32);
        debounced('x');

        setTimeout(function() {
          equal(debounced('y'), 'x');
        }, 64);

        setTimeout(function() {
          equal(debounced('z'), 'y');
          QUnit.start();
        }, 128);
      }
      else {
        skipTest(2);
        QUnit.start();
      }
    });

    asyncTest('subsequent "immediate" debounced calls return the last `func` result', 2, function() {
      if (!(isRhino && isModularize)) {
        var debounced = _.debounce(_.identity, 32, true),
            result = [debounced('x'), debounced('y')];

        deepEqual(result, ['x', 'x']);

        setTimeout(function() {
          var result = [debounced('a'), debounced('b')];
          deepEqual(result, ['a', 'a']);
          QUnit.start();
        }, 64);
      }
      else {
        skipTest(2);
      }
    });

    asyncTest('should apply default options correctly', 2, function() {
      if (!(isRhino && isModularize)) {
        var count = 0;

        var debounced = _.debounce(function(value) {
          count++;
          return value;
        }, 32, {});

        strictEqual(debounced('x'), undefined);

        setTimeout(function() {
          strictEqual(count, 1);
          QUnit.start();
        }, 64);
      }
      else {
        skipTest(2);
        QUnit.start();
      }
    });

    asyncTest('should work with `leading` option', 7, function() {
      if (!(isRhino && isModularize)) {
        var withLeadingAndTrailing,
            counts = [0, 0, 0];

        _.forEach([true, { 'leading': true }], function(options, index) {
          var debounced = _.debounce(function(value) {
            counts[index]++;
            return value;
          }, 32, options);

          if (index == 1) {
            withLeadingAndTrailing = debounced;
          }
          equal(debounced('x'), 'x');
        });

        _.times(2, _.debounce(function() { counts[2]++; }, 32, { 'leading': true }));
        strictEqual(counts[2], 1);

        _.forEach([false, { 'leading': false }], function(options) {
          var withoutLeading = _.debounce(_.identity, 32, options);
          strictEqual(withoutLeading('x'), undefined);
        });

        setTimeout(function() {
          deepEqual(counts, [1, 1, 2]);

          withLeadingAndTrailing('x');
          equal(counts[1], 2);

          QUnit.start();
        }, 64);
      }
      else {
        skipTest(7);
        QUnit.start();
      }
    });

    asyncTest('should work with `trailing` option', 4, function() {
      if (!(isRhino && isModularize)) {
        var withCount = 0,
            withoutCount = 0;

        var withTrailing = _.debounce(function(value) {
          withCount++;
          return value;
        }, 32, { 'trailing': true });

        var withoutTrailing = _.debounce(function(value) {
          withoutCount++;
          return value;
        }, 32, { 'trailing': false });

        strictEqual(withTrailing('x'), undefined);
        strictEqual(withoutTrailing('x'), undefined);

        setTimeout(function() {
          strictEqual(withCount, 1);
          strictEqual(withoutCount, 0);
          QUnit.start();
        }, 64);
      }
      else {
        skipTest(4);
        QUnit.start();
      }
    });

    asyncTest('should work with `maxWait` option', 4, function() {
      if (!(isRhino && isModularize)) {
        var limit = 100,
            withCount = 0,
            withoutCount = 0;

        var withMaxWait = _.debounce(function() {
          withCount++;
        }, 32, { 'maxWait': 64 });

        var withoutMaxWait = _.debounce(function() {
          withoutCount++;
        }, 32);

        var start = new Date;
        while ((new Date - start) < limit) {
          withMaxWait();
          withoutMaxWait();
        }
        strictEqual(withCount, 1);
        strictEqual(withoutCount, 0);

        var lastWithCount = withCount,
            lastWithoutCount = withoutCount;

        setTimeout(function() {
          ok(withCount > lastWithCount);
          ok(withoutCount > lastWithoutCount && withoutCount < withCount);
          QUnit.start();
        }, 64);
      }
      else {
        skipTest(4);
        QUnit.start();
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.defaults');

  (function() {
    test('should not overwrite `null` values', 1, function() {
      var actual = _.defaults({ 'a': null }, { 'a': 1 });
      strictEqual(actual.a, null);
    });

    test('should overwrite `undefined` values', 1, function() {
      var actual = _.defaults({ 'a': undefined }, { 'a': 1 });
      strictEqual(actual.a, 1);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.defer');

  (function() {
    asyncTest('should defer `func` execution', 1, function() {
      if (!(isRhino && isModularize)) {
        var pass = false;
        _.defer(function(){ pass = true; });

        setTimeout(function() {
          ok(pass);
          QUnit.start();
        }, 32);
      }
      else {
        skipTest();
        QUnit.start();
      }
    });

    asyncTest('should accept additional arguments', 1, function() {
      if (!(isRhino && isModularize)) {
        var args;

        _.defer(function() {
          args = slice.call(arguments);
        }, 1, 2, 3);

        setTimeout(function() {
          deepEqual(args, [1, 2, 3]);
          QUnit.start();
        }, 32);
      }
      else {
        skipTest();
        QUnit.start();
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.delay');

  (function() {
    asyncTest('should delay `func` execution', 2, function() {
      if (!(isRhino && isModularize)) {
        var pass = false;
        _.delay(function(){ pass = true; }, 64);

        setTimeout(function() {
          ok(!pass);
        }, 32);

        setTimeout(function() {
          ok(pass);
          QUnit.start();
        }, 96);
      }
      else {
        skipTest(2);
        QUnit.start();
      }
    });

    asyncTest('should accept additional arguments', 1, function() {
      if (!(isRhino && isModularize)) {
        var args;

        _.delay(function() {
          args = slice.call(arguments);
        }, 32, 1, 2, 3);

        setTimeout(function() {
          deepEqual(args, [1, 2, 3]);
          QUnit.start();
        }, 64);
      }
      else {
        skipTest();
        QUnit.start();
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.difference');

  (function() {
    test('should return the difference of the given arrays', 2, function() {
      var actual = _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
      deepEqual(actual, [1, 3, 4]);

      actual = _.difference([1, 2, 3, 4, 5], [5, 2, 10], [8, 4]);
      deepEqual(actual, [1, 3]);
    });

    test('should work with large arrays', 1, function() {
      var array1 = _.range(largeArraySize),
          array2 = array1.slice(),
          a = {},
          b = {},
          c = {};

      array1.push(a, b, c);
      array2.push(b, c, a);

      deepEqual(_.difference(array1, array2), []);
    });

    test('should not accept individual secondary values', 1, function() {
      var array = [1, null, 3];
      deepEqual(_.difference(array, null, 3), array);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.escape');

  (function() {
    var escaped = '&amp;&lt;&gt;&quot;&#39;\/',
        unescaped = '&<>"\'\/';

    test('should not escape the "/" character', 1, function() {
      equal(_.escape('/'), '/');
    });

    test('should escape values', 1, function() {
      equal(_.escape(unescaped), escaped);
    });

    test('should return an empty string when provided `null` or `undefined`', 2, function() {
      equal(_.escape(null), '');
      equal(_.escape(undefined), '');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.every');

  (function() {
    test('should return `true` for empty or falsey collections', 1, function() {
      var actual = [],
          expected = _.map(empties, function() { return true; });

      _.forEach(empties, function(value) {
        try {
          actual.push(_.every(value, _.identity));
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should return `true` if the callback returns truey for all elements in the collection', 1, function() {
      strictEqual(_.every([true, 1, 'x'], _.identity), true);
    });

    test('should return `false` as soon as the callback result is falsey', 1, function() {
      strictEqual(_.every([true, null, true], _.identity), false);
    });

    test('should work with collections of `undefined` values (test in IE < 9)', 1, function() {
      strictEqual(_.every([undefined, undefined, undefined], _.identity), false);
    });

    test('should use `_.identity` when no callback is provided', 2, function() {
      strictEqual(_.every([0]), false);
      strictEqual(_.every([1]), true);
    });

    test('should be aliased', 1, function() {
      strictEqual(_.all, _.every);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('source property checks');

  _.forEach(['assign', 'defaults', 'merge'], function(methodName) {
    var func = _[methodName];

    test('`_.' + methodName + '` should not assign inherited `source` properties', 1, function() {
      function Foo() {}
      Foo.prototype = { 'a': 1 };
      deepEqual(func({}, new Foo), {});
    });

    test('should work when used as `callback` for `_.reduce`', 1, function() {
      var array = [{ 'a':  1 }, { 'b': 2 }, { 'c': 3 }],
          actual = _.reduce(array, _.merge);

      deepEqual(actual, { 'a':  1, 'b': 2, 'c': 3 });
    });

    if (methodName == 'merge') {
      test('`_.' + methodName + '` should treat sparse arrays as dense', 2, function() {
        var array = Array(3);
        array[0] = 1;
        array[2] = 3;

        var actual = func([], array),
            expected = array.slice();

        expected[1] = undefined;

        ok(1 in actual);
        deepEqual(actual, expected);
      });
    }
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('strict mode checks');

  _.forEach(['assign', 'bindAll', 'defaults'], function(methodName) {
    var func = _[methodName];

    test('`_.' + methodName + '` should not throw strict mode errors', 1, function() {
      var object = { 'a': null, 'b': function(){} },
          pass = true;

      if (freeze) {
        freeze(object);
        try {
          if (methodName == 'bindAll') {
            func(object);
          } else {
            func(object, { 'a': 1 });
          }
        } catch(e) {
          pass = false;
        }
        ok(pass);
      }
      else {
        skipTest();
      }
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.filter');

  (function() {
    test('should return elements the `callback` returns truey for', 1, function() {
      var actual = _.filter([1, 2, 3], function(num) {
        return num % 2;
      });

      deepEqual(actual, [1, 3]);
    });

    test('should not modify wrapped values', 2, function() {
      if (!isNpm) {
        var wrapped = _([1, 2, 3, 4]);

        var actual = wrapped.filter(function(num) {
          return num < 3;
        });

        deepEqual(actual.value(), [1, 2]);

        actual = wrapped.filter(function(num) {
          return num > 2;
        });

        deepEqual(actual.value(), [3, 4]);
      }
      else {
        skipTest(2);
      }
    });

    test('should be aliased', 1, function() {
      strictEqual(_.select, _.filter);
    });
  }());

  /*--------------------------------------------------------------------------*/

  (function() {
    var objects = [
      { 'a': 0, 'b': 0 },
      { 'a': 1, 'b': 1 },
      { 'a': 2, 'b': 2 }
    ];

    _.forEach({
      'find': [objects[1], undefined, objects[2], objects[1]],
      'findLast': [objects[2], undefined, objects[2], objects[2]],
      'findIndex': [1, -1, 2, 1],
      'findLastIndex': [2, -1, 2, 2],
      'findKey': ['1', undefined, '2', '1'],
      'findLastKey': ['2', undefined, '2', '2']
    },
    function(expected, methodName) {
      QUnit.module('lodash.' + methodName);

      var func = _[methodName];

      test('should return the correct value', 1, function() {
        strictEqual(func(objects, function(object) { return object.a; }), expected[0]);
      });

      test('should work with a `thisArg`', 1, function() {
        strictEqual(func(objects, function(object, index) { return this[index].a; }, objects), expected[0]);
      });

      test('should return `' + expected[1] + '` if value is not found', 1, function() {
        strictEqual(func(objects, function(object) { return object.a == 3; }), expected[1]);
      });

      test('should work with an object for `callback`', 1, function() {
        strictEqual(func(objects, { 'b': 2 }), expected[2]);
      });

      test('should work with a string for `callback`', 1, function() {
        strictEqual(func(objects, 'b'), expected[3]);
      });

      test('should return `' + expected[1] + '` for empty or falsey collections', 1, function() {
        var actual = [],
            emptyValues = /Index/.test(methodName) ? _.reject(empties, _.isPlainObject) : empties,
            expecting = _.map(emptyValues, function() { return expected[1]; });

        _.forEach(emptyValues, function(value) {
          try {
            actual.push(func(value, { 'a': 3 }));
          } catch(e) { }
        });

        deepEqual(actual, expecting);
      });

      if (methodName == 'find') {
        test('should be aliased', 2, function() {
          strictEqual(_.detect, func);
          strictEqual(_.findWhere, func);
        });
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.first');

  (function() {
    var array = [1, 2, 3];

    var objects = [
      { 'a': 2, 'b': 2 },
      { 'a': 1, 'b': 1 },
      { 'a': 0, 'b': 0 }
    ];

    test('should return the first element', 1, function() {
      strictEqual(_.first(array), 1);
    });

    test('should return the first two elements', 1, function() {
      deepEqual(_.first(array, 2), [1, 2]);
    });

    test('should return an empty array when `n` < `1`', 3, function() {
      _.forEach([0, -1, -2], function(n) {
        deepEqual(_.first(array, n), []);
      });
    });

    test('should return all elements when `n` >= `array.length`', 2, function() {
      _.forEach([3, 4], function(n) {
        deepEqual(_.first(array, n), array);
      });
    });

    test('should return `undefined` when querying empty arrays', 1, function() {
      strictEqual(_.first([]), undefined);
    });

    test('should work when used as `callback` for `_.map`', 1, function() {
      var array = [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          actual = _.map(array, _.first);

      deepEqual(actual, [1, 4, 7]);
    });

    test('should work with a `callback`', 1, function() {
      var actual = _.first(array, function(num) {
        return num < 3;
      });

      deepEqual(actual, [1, 2]);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.first(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [1, 0, array]);
    });

    test('should support the `thisArg` argument', 1, function() {
      var actual = _.first(array, function(num, index) {
        return this[index] < 3;
      }, array);

      deepEqual(actual, [1, 2]);
    });

    test('should chain when passing `n`, `callback`, or `thisArg`', 3, function() {
      if (!isNpm) {
        var actual = _(array).first(2);

        ok(actual instanceof _);

        actual = _(array).first(function(num) {
          return num < 3;
        });

        ok(actual instanceof _);

        actual = _(array).first(function(num, index) {
          return this[index] < 3;
        }, array);

        ok(actual instanceof _);
      }
      else {
        skipTest(3);
      }
    });

    test('should not chain when arguments are not provided', 1, function() {
      if (!isNpm) {
        var actual = _(array).first();
        strictEqual(actual, 1);
      }
      else {
        skipTest();
      }
    });

    test('should work with an object for `callback`', 1, function() {
      deepEqual(_.first(objects, { 'b': 2 }), objects.slice(0, 1));
    });

    test('should work with a string for `callback`', 1, function() {
      deepEqual(_.first(objects, 'b'), objects.slice(0, 2));
    });

    test('should be aliased', 2, function() {
      strictEqual(_.head, _.first);
      strictEqual(_.take, _.first);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.flatten');

  (function() {
    var args = arguments,
        array = [{ 'a': [1, [2]] }, { 'a': [3] }];

    test('should flatten `arguments` objects', 1, function() {
      var actual = _.flatten([args, args]);
      deepEqual(actual, [1, 2, 3, 1, 2, 3]);
    });

    test('should work with a `callback`', 1, function() {
      var actual = _.flatten(array, function(object) {
        return object.a;
      });

      deepEqual(actual, [1, 2, 3]);
    });

    test('should work with `isShallow` and `callback`', 1, function() {
      var actual = _.flatten(array, true, function(object) {
        return object.a;
      });

      deepEqual(actual, [1, [2], 3]);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.flatten(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [{ 'a': [1, [2]] }, 0, array]);
    });

    test('should support the `thisArg` argument', 1, function() {
      var actual = _.flatten(array, function(object, index) {
        return this[index].a;
      }, array);

      deepEqual(actual, [1, 2, 3]);
    });

    test('should work with a string for `callback`', 1, function() {
      deepEqual(_.flatten(array, 'a'), [1, 2, 3]);
    });

    test('should perform a deep flatten when used as `callback` for `_.map`', 1, function() {
      var array = [[[['a']]], [[['b']]]],
          actual = _.map(array, _.flatten);

      deepEqual(actual, [['a'], ['b']]);
    });

    test('should treat sparse arrays as dense', 4, function() {
      var array = [[1, 2, 3], Array(3)],
          expected = [1, 2, 3],
          actual1 = _.flatten(array),
          actual2 = _.flatten(array, true);

      expected.push(undefined, undefined, undefined);

      deepEqual(actual1, expected);
      ok(4 in actual1);

      deepEqual(actual2, expected);
      ok(4 in actual2);
    });

    test('should work with extremely large arrays', 1, function() {
      var expected = Array(5e5),
          pass = true;

      if (freeze) {
        try {
          var actual = _.flatten([expected]);
        } catch(e) {
          pass = false;
        }
        if (pass) {
          deepEqual(actual, expected);
        } else {
          ok(pass);
        }
      } else {
        skipTest();
      }
    });

    test('should work with empty arrays', 1, function() {
      var actual = _.flatten([[], [[]], [[], [[[]]]]]);
      deepEqual(actual, []);
    });

    test('should flatten nested arrays', 1, function() {
      var array = [1, [2], [3, [[4]]]],
          expected = [1, 2, 3, 4];

      deepEqual(_.flatten(array), expected);
    });

    test('should support shallow flattening nested arrays', 1, function() {
      var array = [1, [2], [3, [4]]],
          expected = [1, 2, 3, [4]];

      deepEqual(_.flatten(array, true), expected);
    });

    test('should support shallow flattening arrays of other arrays', 1, function() {
      var array = [[1], [2], [3], [[4]]],
          expected = [1, 2, 3, [4]];

      deepEqual(_.flatten(array, true), expected);
    });
  }(1, 2, 3));

  /*--------------------------------------------------------------------------*/

  QUnit.module('forEach methods');

  _.forEach(['forEach', 'forEachRight'], function(methodName) {
    var func = _[methodName];

    _.forEach({
      'literal': 'abc',
      'object': Object('abc')
    },
    function(collection, key) {
      test('`_.' + methodName + '` should work with a string ' + key + ' for `collection` (test in IE < 9)', 2, function() {
        var args,
            values = [];

        func(collection, function(value) {
          args || (args = slice.call(arguments));
          values.push(value);
        });

        if (methodName == 'forEach') {
          deepEqual(args, ['a', 0, collection]);
          deepEqual(values, ['a', 'b', 'c']);
        } else {
          deepEqual(args, ['c', 2, collection]);
          deepEqual(values, ['c', 'b', 'a']);
        }
      });
    });

    test('`_.' + methodName + '` should be aliased', 1, function() {
      if (methodName == 'forEach') {
        strictEqual(_.each, _.forEach);
      } else {
        strictEqual(_.eachRight, _.forEachRight);
      }
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('forIn methods');

  _.forEach(['forIn', 'forInRight'], function(methodName) {
    var func = _[methodName];

    test('`_.' + methodName + '` iterates over inherited properties', 1, function() {
      function Foo() { this.a = 1; }
      Foo.prototype.b = 2;

      var keys = [];
      func(new Foo, function(value, key) { keys.push(key); });
      deepEqual(keys.sort(), ['a', 'b']);
    });

    test('`_.' + methodName + '` fixes the JScript [[DontEnum]] bug with inherited properties (test in IE < 9)', 1, function() {
      function Foo() {}
      Foo.prototype = shadowedObject;

      function Bar() {}
      Bar.prototype = new Foo;
      Bar.prototype.constructor = Bar;

      var keys = [];
      func(shadowedObject, function(value, key) { keys.push(key); });
      deepEqual(keys.sort(), shadowedProps);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('forOwn methods');

  _.forEach(['forOwn', 'forOwnRight'], function(methodName) {
    var func = _[methodName];

    test('iterates over the `length` property', 1, function() {
      var object = { '0': 'zero', '1': 'one', 'length': 2 },
          props = [];

      func(object, function(value, prop) { props.push(prop); });
      deepEqual(props.sort(), ['0', '1', 'length']);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('iteration methods');

  (function() {
    var methods = [
      'every',
      'filter',
      'forEach',
      'forEachRight',
      'forIn',
      'forInRight',
      'forOwn',
      'forOwnRight',
      'map',
      'reject',
      'some'
    ];

    var boolMethods = [
      'every',
      'some'
    ];

    var forInMethods = [
      'forIn',
      'forInRight'
    ];

    var iterationMethods = [
      'forEach',
      'forEachRight',
      'forIn',
      'forInRight',
      'forOwn',
      'forOwnRight'
    ]

    var objectMethods = [
      'forIn',
      'forInRight',
      'forOwn',
      'forOwnRight'
    ];

    var rightMethods = [
      'forEachRight',
      'forInRight',
      'forOwnRight'
    ];

    _.forEach(methods, function(methodName) {
      var array = [1, 2, 3],
          func = _[methodName];

      test('`_.' + methodName + '` should pass the correct `callback` arguments', 1, function() {
        var args,
            expected = [1, 0, array];

        func(array, function() {
          args || (args = slice.call(arguments));
        });

        if (_.contains(rightMethods, methodName)) {
          expected[0] = 3;
          expected[1] = 2;
        }
        if (_.contains(objectMethods, methodName)) {
          expected[1] += '';
        }
        deepEqual(args, expected);
      });

      test('`_.' + methodName + '` should support the `thisArg` argument', 2, function() {
        var actual;

        function callback(num, index) {
          actual = this[index];
        }

        func([1], callback, [2]);
        equal(actual, 2);

        func({ 'a': 1 }, callback, { 'a': 2 });
        equal(actual, 2);
      });
    });

    _.forEach(_.difference(methods, boolMethods), function(methodName) {
      var array = [1, 2, 3],
          func = _[methodName];

      test('`_.' + methodName + '` should return a wrapped value when chaining', 1, function() {
        if (!isNpm) {
          var actual = _(array)[methodName](Boolean);
          ok(actual instanceof _);
        }
        else {
          skipTest();
        }
      });
    });

    _.forEach(_.difference(methods, forInMethods), function(methodName) {
      var array = [1, 2, 3],
          func = _[methodName];

      test('`_.' + methodName + '` iterates over own properties of objects', 1, function() {
        function Foo() { this.a = 1; }
        Foo.prototype.b = 2;

        var keys = [];
        func(new Foo, function(value, key) { keys.push(key); });
        deepEqual(keys, ['a']);
      });
    });

    _.forEach(iterationMethods, function(methodName) {
      var array = [1, 2, 3],
          func = _[methodName];

      test('`_.' + methodName + '` should return the collection', 1, function() {
        equal(func(array, Boolean), array);
      });

      test('`_.' + methodName + '` should return the existing wrapper when chaining', 1, function() {
        if (!isNpm) {
          var wrapper = _(array);
          equal(wrapper[methodName](Boolean), wrapper);
        }
        else {
          skipTest();
        }
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('collection iteration bugs');

  _.forEach(['forEach', 'forEachRight', 'forIn', 'forInRight', 'forOwn', 'forOwnRight'], function(methodName) {
    var func = _[methodName];

    test('`_.' + methodName + '` fixes the JScript [[DontEnum]] bug (test in IE < 9)', 1, function() {
      var props = [];
      func(shadowedObject, function(value, prop) { props.push(prop); });
      deepEqual(props.sort(), shadowedProps);
    });

    test('`_.' + methodName + '` does not iterate over non-enumerable properties (test in IE < 9)', 10, function() {
      _.forOwn({
        'Array': Array.prototype,
        'Boolean': Boolean.prototype,
        'Date': Date.prototype,
        'Error': Error.prototype,
        'Function': Function.prototype,
        'Object': Object.prototype,
        'Number': Number.prototype,
        'TypeError': TypeError.prototype,
        'RegExp': RegExp.prototype,
        'String': String.prototype
      },
      function(object, builtin) {
        var message = 'non-enumerable properties on ' + builtin + '.prototype',
            props = [];

        func(object, function(value, prop) { props.push(prop); });

        if (/Error/.test(builtin)) {
          ok(_.every(['constructor', 'toString'], function(prop) {
            return !_.contains(props, prop);
          }), message);
        }
        else {
          deepEqual(props, [], message);
        }
      });
    });

    test('`_.' + methodName + '` skips the prototype property of functions (test in Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1)', 2, function() {
      function Foo() {}
      Foo.prototype.a = 1;

      var props = [];
      function callback(value, prop) { props.push(prop); }

      func(Foo, callback);
      deepEqual(props, []);
      props.length = 0;

      Foo.prototype = { 'a': 1 };
      func(Foo, callback);
      deepEqual(props, []);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('object assignments');

  _.forEach(['assign', 'defaults', 'merge'], function(methodName) {
    var func = _[methodName];

    test('`_.' + methodName + '` should return the existing wrapper when chaining', 1, function() {
      if (!isNpm) {
        var wrapper = _({ 'a': 1 });
        equal(wrapper[methodName]({ 'b': 2 }), wrapper);
      }
      else {
        skipTest();
      }
    });

    test('`_.' + methodName + '` should assign problem JScript properties (test in IE < 9)', 1, function() {
      var object = {
        'constructor': '0',
        'hasOwnProperty': '1',
        'isPrototypeOf': '2',
        'propertyIsEnumerable': undefined,
        'toLocaleString': undefined,
        'toString': undefined,
        'valueOf': undefined
      };

      var source = {
        'propertyIsEnumerable': '3',
        'toLocaleString': '4',
        'toString': '5',
        'valueOf': '6'
      };

      deepEqual(func(object, source), shadowedObject);
    });

    test('`_.' + methodName + '` skips the prototype property of functions (test in Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1)', 2, function() {
      function Foo() {}
      Foo.prototype.c = 3;

      Foo.a = 1;
      Foo.b = 2;

      var expected = { 'a': 1, 'b': 2 };
      deepEqual(func({}, Foo), expected);

      Foo.prototype = { 'c': 3 };
      deepEqual(func({}, Foo), expected);
    });

    test('`_.' + methodName + '` should work with `_.reduce`', 1, function() {
      var actual = { 'a': 1},
          array = [{ 'b': 2 }, { 'c': 3 }];

      _.reduce(array, func, actual);
      deepEqual(actual, { 'a': 1, 'b': 2, 'c': 3});
    });
  });

  _.forEach(['assign', 'merge'], function(methodName) {
    var func = _[methodName];

    test('`_.' + methodName + '` should pass the correct `callback` arguments', 2, function() {
      var args;

      func({ 'a': 1 }, { 'a': 2 }, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [1, 2], 'primitive property values');

      var array = [1, 2],
          object = { 'b': 2 };

      args = null;
      func({ 'a': array }, { 'a': object }, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [array, object], 'non-primitive property values');
    });

    test('`_.' + methodName + '`should support the `thisArg` argument', 1, function() {
      var actual = func({}, { 'a': 0 }, function(a, b) {
        return this[b];
      }, [2]);

      deepEqual(actual, { 'a': 2 });
    });

    test('`_.' + methodName + '` should not treat the second argument as a `callback`', 2, function() {
      function callback() {}
      callback.b = 2;

      var actual = func({ 'a': 1 }, callback);
      deepEqual(actual, { 'a': 1, 'b': 2 });

      actual = func({ 'a': 1 }, callback, { 'c': 3 });
      deepEqual(actual, { 'a': 1, 'b': 2, 'c': 3 });
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('exit early');

  _.forEach(['forEach', 'forEachRight', 'forIn', 'forInRight', 'forOwn', 'forOwnRight'], function(methodName) {
    var func = _[methodName];

    test('`_.' + methodName + '` can exit early when iterating arrays', 1, function() {
      var array = [1, 2, 3],
          values = [];

      func(array, function(value) { values.push(value); return false; });
      deepEqual(values, [/Right/.test(methodName) ? 3 : 1]);
    });

    test('`_.' + methodName + '` can exit early when iterating objects', 1, function() {
      var object = { 'a': 1, 'b': 2, 'c': 3 },
          values = [];

      func(object, function(value) { values.push(value); return false; });
      equal(values.length, 1);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('`__proto__` property bugs');

  (function() {
    var stringLiteral = '__proto__',
        stringObject = Object(stringLiteral),
        expected = [stringLiteral, stringObject];

    var array = _.times(largeArraySize, function(count) {
      return count % 2 ? stringObject : stringLiteral;
    });

    test('internal data objects should work with the `__proto__` key', 4, function() {
      deepEqual(_.difference(array, array), []);
      deepEqual(_.intersection(array, array), expected);
      deepEqual(_.uniq(array), expected);
      deepEqual(_.without.apply(_, [array].concat(array)), []);
    });

    test('lodash.memoize should memoize values resolved to the `__proto__` key', 1, function() {
      var count = 0,
          memoized = _.memoize(function() { return ++count; });

      memoized('__proto__');
      memoized('__proto__');
      strictEqual(count, 1);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.function');

  (function() {
    test('should be aliased', 1, function() {
      strictEqual(_.methods, _.functions);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.groupBy');

  (function() {
    var array = [4.2, 6.1, 6.4];

    test('should use `_.identity` when no `callback` is provided', 1, function() {
      var actual = _.groupBy([4, 6, 6]);
      deepEqual(actual, { '4': [4], '6':  [6, 6] });
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.groupBy(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [4.2, 0, array]);
    });

    test('should support the `thisArg` argument', 1, function() {
      var actual = _.groupBy(array, function(num) {
        return this.floor(num);
      }, Math);

      deepEqual(actual, { '4': [4.2], '6': [6.1, 6.4] });
    });

    test('should only add values to own, not inherited, properties', 2, function() {
      var actual = _.groupBy([4.2, 6.1, 6.4], function(num) {
        return Math.floor(num) > 4 ? 'hasOwnProperty' : 'constructor';
      });

      deepEqual(actual.constructor, [4.2]);
      deepEqual(actual.hasOwnProperty, [6.1, 6.4]);
    });

    test('should work with an object for `collection`', 1, function() {
      var actual = _.groupBy({ 'a': 4.2, 'b': 6.1, 'c': 6.4 }, function(num) {
        return Math.floor(num);
      });

      deepEqual(actual, { '4': [4.2], '6': [6.1, 6.4] });
    });

    test('should work with a number for `callback`', 2, function() {
      var array = [
        [1, 'a'],
        [2, 'a'],
        [2, 'b']
      ];

      deepEqual(_.groupBy(array, 0), { '1': [[1 , 'a']], '2': [[2, 'a'], [2, 'b']] });
      deepEqual(_.groupBy(array, 1), { 'a': [[1 , 'a'], [2, 'a']], 'b': [[2, 'b']] });
    });

    test('should work with a string for `callback`', 1, function() {
      var actual = _.groupBy(['one', 'two', 'three'], 'length');
      deepEqual(actual, { '3': ['one', 'two'], '5': ['three'] });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.has');

  (function() {
    test('should return `false` for primitives', 1, function() {
      var actual = [],
          values = falsey.concat(1, 'a'),
          expected = _.map(values, function() { return false; });

      _.forEach(values, function(value) {
        actual.push(_.has(value, 'valueOf'));
      });

      deepEqual(actual, expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.identity');

  (function() {
    test('should return the first argument provided', 1, function() {
      var object = { 'name': 'fred' };
      strictEqual(_.identity(object), object);
    });
  }())

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.indexBy');

  (function() {
    test('should use `_.identity` when no `callback` is provided', 1, function() {
      var actual = _.indexBy([4, 6, 6]);
      deepEqual(actual, { '4': 4, '6': 6 });
    });

    test('should support the `thisArg` argument', 1, function() {
      var actual = _.indexBy([4.2, 6.1, 6.4], function(num) {
        return this.floor(num);
      }, Math);

      deepEqual(actual, { '4': 4.2, '6': 6.4 });
    });

    test('should only add values to own, not inherited, properties', 2, function() {
      var actual = _.indexBy([4.2, 6.1, 6.4], function(num) {
        return Math.floor(num) > 4 ? 'hasOwnProperty' : 'constructor';
      });

      deepEqual(actual.constructor, 4.2);
      deepEqual(actual.hasOwnProperty, 6.4);
    });

    test('should work with an object for `collection`', 1, function() {
      var actual = _.indexBy({ 'a': 4.2, 'b': 6.1, 'c': 6.4 }, function(num) {
        return Math.floor(num);
      });

      deepEqual(actual, { '4': 4.2, '6': 6.4 });
    });

    test('should work with a number for `callback`', 2, function() {
      var array = [
        [1, 'a'],
        [2, 'a'],
        [2, 'b']
      ];

      deepEqual(_.indexBy(array, 0), { '1': [1 , 'a'], '2': [2, 'b'] });
      deepEqual(_.indexBy(array, 1), { 'a': [2, 'a'], 'b': [2, 'b'] });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.indexOf');

  (function() {
    var array = [1, 2, 3, 1, 2, 3];

    test('should return the index of the first matched value', 1, function() {
      equal(_.indexOf(array, 3), 2);
    });

    test('should return `-1` for an unmatched value', 1, function() {
      equal(_.indexOf(array, 4), -1);
    });

    test('should work with a positive `fromIndex`', 1, function() {
      equal(_.indexOf(array, 1, 2), 3);
    });

    test('should work with `fromIndex` >= `array.length`', 4, function() {
      equal(_.indexOf(array, 1, 6), -1);
      equal(_.indexOf(array, undefined, 6), -1);
      equal(_.indexOf(array, 1, 8), -1);
      equal(_.indexOf(array, undefined, 8), -1);
    });

    test('should work with a negative `fromIndex`', 1, function() {
      equal(_.indexOf(array, 2, -3), 4);
    });

    test('should work with a negative `fromIndex` <= `-array.length`', 2, function() {
      strictEqual(_.indexOf(array, 1, -6), 0);
      strictEqual(_.indexOf(array, 2, -8), 1);
    });

    test('should ignore non-number `fromIndex` values', 1, function() {
      strictEqual(_.indexOf([1, 2, 3], 1, '1'), 0);
    });

    test('should work with `isSorted`', 1, function() {
      strictEqual(_.indexOf([1, 2, 3], 1, true), 0);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('custom `_.indexOf` methods');

  (function() {
    function custom(array, value, fromIndex) {
      var index = (fromIndex || 0) - 1,
          length = array.length;

      while (++index < length) {
        var other = array[index];
        if (other === value ||
            (_.isObject(value) && other instanceof Foo) ||
            (other === 'x' && /[13]/.test(value))) {
          return index;
        }
      }
      return -1;
    }

    function Foo() {}

    var array = [1, new Foo, 3, new Foo],
        indexOf = _.indexOf;

    test('`_.contains` should work with a custom `_.indexOf` method', 1, function() {
      if (!isModularize) {
        _.indexOf = custom;
        ok(_.contains(array, new Foo));
        _.indexOf = indexOf;
      }
      else {
        skipTest();
      }
    });

    test('`_.difference` should work with a custom `_.indexOf` method', 1, function() {
      if (!isModularize) {
        _.indexOf = custom;
        deepEqual(_.difference(array, [new Foo]), [1, 3]);
        _.indexOf = indexOf;
      }
      else {
        skipTest();
      }
    });

    test('`_.intersection` should work with a custom `_.indexOf` method', 1, function() {
      if (!isModularize) {
        _.indexOf = custom;
        deepEqual(_.intersection(array, [new Foo]), [array[1]]);
        _.indexOf = indexOf;
      }
      else {
        skipTest();
      }
    });

    test('`_.omit` should work with a custom `_.indexOf` method', 1, function() {
      if (!isModularize) {
        _.indexOf = custom;
        deepEqual(_.omit(array, ['x']), { '0': 1, '2': 3 });
        _.indexOf = indexOf;
      }
      else {
        skipTest();
      }
    });

    test('`_.uniq` should work with a custom `_.indexOf` method', 2, function() {
      if (!isModularize) {
        _.indexOf = custom;
        deepEqual(_.uniq(array), array.slice(0, 3));

        var largeArray = _.times(largeArraySize, function() {
          return new Foo;
        });

        deepEqual(_.uniq(largeArray), [largeArray[0]]);
        _.indexOf = indexOf;
      }
      else {
        skipTest(2);
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.initial');

  (function() {
    var array = [1, 2, 3];

    var objects = [
      { 'a': 0, 'b': 0 },
      { 'a': 1, 'b': 1 },
      { 'a': 2, 'b': 2 }
    ];

    test('should accept a falsey `array` argument', 1, function() {
      var actual = [],
          expected = _.map(falsey, function() { return []; });

      _.forEach(falsey, function(value, index) {
        try {
          actual.push(index ? _.initial(value) : _.initial());
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should exclude last element', 1, function() {
      deepEqual(_.initial(array), [1, 2]);
    });

    test('should exclude the last two elements', 1, function() {
      deepEqual(_.initial(array, 2), [1]);
    });

    test('should return an empty when querying empty arrays', 1, function() {
      deepEqual(_.initial([]), []);
    });

    test('should return all elements when `n` < `1`', 3, function() {
      _.forEach([0, -1, -2], function(n) {
        deepEqual(_.initial(array, n), array);
      });
    });

    test('should return an empty array when `n` >= `array.length`', 2, function() {
      _.forEach([3, 4], function(n) {
        deepEqual(_.initial(array, n), []);
      });
    });

    test('should work when used as `callback` for `_.map`', 1, function() {
      var array = [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          actual = _.map(array, _.initial);

      deepEqual(actual, [[1, 2], [4, 5], [7, 8]]);
    });

    test('should work with a `callback`', 1, function() {
      var actual = _.initial(array, function(num) {
        return num > 1;
      });

      deepEqual(actual, [1]);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.initial(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [3, 2, array]);
    });

    test('should support the `thisArg` argument', 1, function() {
      var actual = _.initial(array, function(num, index) {
        return this[index] > 1;
      }, array);

      deepEqual(actual, [1]);
    });

    test('should work with an object for `callback`', 1, function() {
      deepEqual(_.initial(objects, { 'b': 2 }), objects.slice(0, 2));
    });

    test('should work with a string for `callback`', 1, function() {
      deepEqual(_.initial(objects, 'b'), objects.slice(0, 1));
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.intersection');

  (function() {
    test('should return the intersection of the given arrays', 1, function() {
      var actual = _.intersection([1, 3, 2], [101, 2, 1, 10], [2, 1]);
      deepEqual(actual, [1, 2]);
    });

    test('should return an array of unique values', 1, function() {
      var actual = _.intersection([1, 1, 3, 2, 2], [101, 2, 2, 1, 101], [2, 1, 1]);
      deepEqual(actual, [1, 2]);
    });

    test('should return a wrapped value when chaining', 2, function() {
      if (!isNpm) {
        var actual = _([1, 3, 2]).intersection([101, 2, 1, 10]);
        ok(actual instanceof _);
        deepEqual(actual.value(), [1, 2]);
      }
      else {
        skipTest(2);
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.invoke');

  (function() {
    test('should invoke a methods on each element of a collection', 1, function() {
      var actual = _.invoke(['a', 'b', 'c'], 'toUpperCase');
      deepEqual(actual, ['A', 'B', 'C']);
    });

    test('should work with a function `methodName` argument', 1, function() {
      var actual = _.invoke(['a', 'b', 'c'], function() {
        return this.toUpperCase();
      });

      deepEqual(actual, ['A', 'B', 'C']);
    });

    test('should work with an object for `collection`', 1, function() {
      var object = { 'a': 1, 'b': 2, 'c': 3 };
      deepEqual(_.invoke(object, 'toFixed', 1), ['1.0', '2.0', '3.0']);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.isArguments');

  (function() {
    var args = arguments;

    test('should return `true` for `arguments` objects', 1, function() {
      strictEqual(_.isArguments(args), true);
    });

    test('should return `false` for arrays', 1, function() {
      strictEqual(_.isArguments([1, 2, 3]), false);
    });
  }(1, 2, 3));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.isArray');

  (function() {
    var args = arguments;

    test('should return `true` for arrays', 1, function() {
      strictEqual(_.isArray([1, 2, 3]), true);
    });

    test('should return `false` for `arguments` objects', 1, function() {
      strictEqual(_.isArray(args), false);
    });
  }(1, 2, 3));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.isElement');

  (function() {
    test('should use strict equality in its duck type check', 6, function() {
      var element = body || { 'nodeType': 1 };

      strictEqual(_.isElement(element), true);
      strictEqual(_.isElement({ 'nodeType': new Number(1) }), false);
      strictEqual(_.isElement({ 'nodeType': true }), false);
      strictEqual(_.isElement({ 'nodeType': [1] }), false);
      strictEqual(_.isElement({ 'nodeType': '1' }), false);
      strictEqual(_.isElement({ 'nodeType': '001' }), false);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.isEmpty');

  (function() {
    var args = arguments;

    test('fixes the JScript [[DontEnum]] bug (test in IE < 9)', 1, function() {
      equal(_.isEmpty(shadowedObject), false);
    });

    test('skips the prototype property of functions (test in Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1)', 2, function() {
      function Foo() {}
      Foo.prototype.a = 1;
      strictEqual(_.isEmpty(Foo), true);

      Foo.prototype = { 'a': 1 };
      strictEqual(_.isEmpty(Foo), true);
    });

    test('should work with an object that has a `length` property', 1, function() {
      strictEqual(_.isEmpty({ 'length': 0 }), false);
    });

    test('should work with jQuery/MooTools DOM query collections', 1, function() {
      function Foo(elements) { push.apply(this, elements); }
      Foo.prototype = { 'length': 0, 'splice': Array.prototype.splice };

      strictEqual(_.isEmpty(new Foo([])), true);
    });

    test('should work with `arguments` objects (test in IE < 9)', 1, function() {
      if (!isPhantomPage) {
        strictEqual(_.isEmpty(args), false);
      } else {
        skipTest();
      }
    });
  }(1, 2, 3));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.isEqual');

  (function() {
    test('should work with `arguments` objects (test in IE < 9)', 2, function() {
      var args1 = (function() { return arguments; }(1, 2, 3)),
          args2 = (function() { return arguments; }(1, 2, 3)),
          args3 = (function() { return arguments; }(1, 2));

      if (!isPhantomPage) {
        strictEqual(_.isEqual(args1, args2), true);
        strictEqual(_.isEqual(args1, args3), false);
      } else {
        skipTest(2);
      }
    });

    test('fixes the JScript [[DontEnum]] bug (test in IE < 9)', 1, function() {
      strictEqual(_.isEqual(shadowedObject, {}), false);
    });

    test('should return `true` for like-objects from different documents', 1, function() {
      // ensure `_._object` is assigned (unassigned in Opera 10.00)
      if (_._object) {
        var object = { 'a': 1, 'b': 2, 'c': 3 };
        strictEqual(_.isEqual(object, _._object), true);
      } else {
        skipTest();
      }
    });

    test('should return `false` when comparing values with circular references to unlike values', 2, function() {
      var array1 = ['a', null, 'c'],
          array2 = ['a', [], 'c'],
          object1 = { 'a': 1, 'b': null, 'c': 3 },
          object2 = { 'a': 1, 'b': {}, 'c': 3 };

      array1[1] = array1;
      strictEqual(_.isEqual(array1, array2), false);

      object1.b = object1;
      strictEqual(_.isEqual(object1, object2), false);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.isEqual('a', 'b', function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, ['a', 'b']);
    });

    test('should correctly set the `this` binding', 1, function() {
      var actual = _.isEqual('a', 'b', function(a, b) {
        return this[a] == this[b];
      }, { 'a': 1, 'b': 1 });

      strictEqual(actual, true);
    });

    test('should handle comparisons if `callback` returns `undefined`', 1, function() {
      var actual = _.isEqual('a', 'a', function() {});
      strictEqual(actual, true);
    });

    test('should return a boolean value even if `callback` does not', 8, function() {
      var actual = _.isEqual('a', 'a', function() { return 'a'; });
      strictEqual(actual, true);

      _.forEach(falsey, function(value) {
        var actual = _.isEqual('a', 'b', function() { return value; });
        strictEqual(actual, false);
      });
    });

    test('should ensure `callback` is a function', 1, function() {
      var array = [1, 2, 3],
          eq = _.partial(_.isEqual, array),
          actual = _.every([array, [1, 0, 3]], eq);

      strictEqual(actual, false);
    });

    test('should treat objects created by `Object.create(null)` like any other plain object', 2, function() {
      function Foo() { this.a = 1; }
      Foo.prototype.constructor = null;

      var other = { 'a': 1 };
      strictEqual(_.isEqual(new Foo, other), false);

      if (create)  {
        var object = Object.create(null);
        object.a = 1;
        strictEqual(_.isEqual(object, other), true);
      }
      else {
        skipTest();
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.isFinite');

  (function() {
    test('should return `false` for non-numeric values', 6, function() {
      strictEqual(_.isFinite(null), false);
      strictEqual(_.isFinite([]), false);
      strictEqual(_.isFinite(true), false);
      strictEqual(_.isFinite(''), false);
      strictEqual(_.isFinite(' '), false);
      strictEqual(_.isFinite('2px'), false);
    });

    test('should return `true` for numeric string values', 3, function() {
      strictEqual(_.isFinite('2'), true);
      strictEqual(_.isFinite('0'), true);
      strictEqual(_.isFinite('08'), true);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.isObject');

  (function() {
    test('should avoid V8 bug #2291', 1, function() {
      // trigger V8 bug
      // http://code.google.com/p/v8/issues/detail?id=2291
      var obj = {},
          str = 'foo';

      // 1: Useless comparison statement, this is half the trigger
      obj == obj;
      // 2: Initial check with object, this is the other half of the trigger
      _.isObject(obj);

      equal(_.isObject(str), false);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.isNaN');

  (function() {
    test('returns `true` for `new Number(NaN)`', 1, function() {
      strictEqual(_.isNaN(new Number(NaN)), true);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.isNumber');

  (function() {
    test('should avoid `[xpconnect wrapped native prototype]` in Firefox', 1, function() {
      strictEqual(_.isNumber(+"2"), true);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.isPlainObject');

  (function() {
    test('should detect plain objects', 5, function() {
      function Foo(a) {
        this.a = 1;
      }

      strictEqual(_.isPlainObject(new Foo(1)), false);
      strictEqual(_.isPlainObject([1, 2, 3]), false);
      strictEqual(_.isPlainObject({ 'a': 1 }), true);

      if (create) {
        strictEqual(_.isPlainObject(create(null)), true);
      } else {
        skipTest();
      }
      if (document) {
        strictEqual(_.isPlainObject(body), false);
      } else {
        skipTest();
      }
    });

    test('should return `true` for empty objects', 1, function() {
      strictEqual(_.isPlainObject({}), true);
    });

    test('should return `false` for Object objects without a [[Class]] of "Object"', 4, function() {
      strictEqual(_.isPlainObject(arguments), false);
      strictEqual(_.isPlainObject(Error), false);
      strictEqual(_.isPlainObject(Math), false);
      strictEqual(_.isPlainObject(root), false);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('isType checks');

  _.forEach([
    'isArguments',
    'isArray',
    'isBoolean',
    'isDate',
    'isElement',
    'isEmpty',
    'isEqual',
    'isFinite',
    'isFunction',
    'isNaN',
    'isNull',
    'isNumber',
    'isObject',
    'isRegExp',
    'isString',
    'isUndefined'
  ],
  function(methodName) {
    var func = _[methodName];

    test('`_.' + methodName + '` should return a boolean', 15, function() {
      var expected = 'boolean';

      equal(typeof func(arguments), expected);
      equal(typeof func([]), expected);
      equal(typeof func(true), expected);
      equal(typeof func(false), expected);
      equal(typeof func(new Date), expected);
      equal(typeof func(body), expected);
      equal(typeof func({}), expected);
      equal(typeof func(undefined), expected);
      equal(typeof func(Infinity), expected);
      equal(typeof func(_), expected);
      equal(typeof func(NaN), expected);
      equal(typeof func(null), expected);
      equal(typeof func(0), expected);
      equal(typeof func({ 'a': 1 }), expected);
      equal(typeof func('a'), expected);
    });
  });

  (function() {
    test('should return `false` for subclassed values', 7, function() {
      _.forEach(['isArray', 'isBoolean', 'isDate', 'isFunction', 'isNumber', 'isRegExp', 'isString'], function(methodName) {
        function Foo() {}
        Foo.prototype = root[methodName.slice(2)].prototype;

        var object = new Foo;
        if (toString.call(object) == '[object Object]') {
          strictEqual(_[methodName](object), false, '`_.' + methodName + '` returns `false`');
        } else {
          skipTest();
        }
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.keys');

  (function() {
    var args = arguments;

    test('should work with `arguments` objects (test in IE < 9)', 1, function() {
      if (!isPhantomPage) {
        deepEqual(_.keys(args), ['0', '1', '2']);
      } else {
        skipTest();
      }
    });

    test('fixes the JScript [[DontEnum]] bug (test in IE < 9)', 2, function() {
      function Foo() {}
      Foo.prototype.a = 1;

      deepEqual(_.keys(Foo.prototype), ['a']);
      deepEqual(_.keys(shadowedObject).sort(), shadowedProps);
    });

    test('skips the prototype property of functions (test in Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1)', 2, function() {
      function Foo() {}
      Foo.prototype.c = 3;

      Foo.a = 1;
      Foo.b = 2;

      var expected = ['a', 'b'];
      deepEqual(_.keys(Foo), expected);

      Foo.prototype = { 'c': 3 };
      deepEqual(_.keys(Foo), expected);
    });
  }(1, 2, 3));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.last');

  (function() {
    var array = [1, 2, 3];

    var objects = [
      { 'a': 0, 'b': 0 },
      { 'a': 1, 'b': 1 },
      { 'a': 2, 'b': 2 }
    ];

    test('should return the last element', 1, function() {
      equal(_.last(array), 3);
    });

    test('should return the last two elements', 1, function() {
      deepEqual(_.last(array, 2), [2, 3]);
    });

    test('should return an empty array when `n` < `1`', 3, function() {
      _.forEach([0, -1, -2], function(n) {
        deepEqual(_.last(array, n), []);
      });
    });

    test('should return all elements when `n` >= `array.length`', 2, function() {
      _.forEach([3, 4], function(n) {
        deepEqual(_.last(array, n), array);
      });
    });

    test('should return `undefined` when querying empty arrays', 1, function() {
      strictEqual(_.last([]), undefined);
    });

    test('should work when used as `callback` for `_.map`', 1, function() {
      var array = [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          actual = _.map(array, _.last);

      deepEqual(actual, [3, 6, 9]);
    });

    test('should work with a `callback`', 1, function() {
      var actual = _.last(array, function(num) {
        return num > 1;
      });

      deepEqual(actual, [2, 3]);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.last(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [3, 2, array]);
    });

    test('should support the `thisArg` argument', 1, function() {
      var actual = _.last(array, function(num, index) {
        return this[index] > 1;
      }, array);

      deepEqual(actual, [2, 3]);
    });

    test('should chain when passing `n`, `callback`, or `thisArg`', 3, function() {
      if (!isNpm) {
        var actual = _(array).last(2);

        ok(actual instanceof _);

        actual = _(array).last(function(num) {
          return num > 1;
        });

        ok(actual instanceof _);

        actual = _(array).last(function(num, index) {
          return this[index] > 1;
        }, array);

        ok(actual instanceof _);
      }
      else {
        skipTest(3);
      }
    });

    test('should not chain when arguments are not provided', 1, function() {
      if (!isNpm) {
        var actual = _(array).last();
        equal(actual, 3);
      }
      else {
        skipTest();
      }
    });

    test('should work with an object for `callback`', 1, function() {
      deepEqual(_.last(objects, { 'b': 2 }), objects.slice(-1));
    });

    test('should work with a string for `callback`', 1, function() {
      deepEqual(_.last(objects, 'b'), objects.slice(-2));
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.lastIndexOf');

  (function() {
    var array = [1, 2, 3, 1, 2, 3];

    test('should return the index of the last matched value', 1, function() {
      equal(_.lastIndexOf(array, 3), 5);
    });

    test('should return `-1` for an unmatched value', 1, function() {
      equal(_.lastIndexOf(array, 4), -1);
    });

    test('should work with a positive `fromIndex`', 1, function() {
      strictEqual(_.lastIndexOf(array, 1, 2), 0);
    });

    test('should work with `fromIndex` >= `array.length`', 4, function() {
      equal(_.lastIndexOf(array, undefined, 6), -1);
      equal(_.lastIndexOf(array, 1, 6), 3);
      equal(_.lastIndexOf(array, undefined, 8), -1);
      equal(_.lastIndexOf(array, 1, 8), 3);
    });

    test('should work with a negative `fromIndex`', 1, function() {
      strictEqual(_.lastIndexOf(array, 2, -3), 1);
    });

    test('should work with a negative `fromIndex` <= `-array.length`', 2, function() {
      strictEqual(_.lastIndexOf(array, 1, -6), 0);
      equal(_.lastIndexOf(array, 2, -8), -1);
    });

    test('should ignore non-number `fromIndex` values', 2, function() {
      equal(_.lastIndexOf([1, 2, 3], 3, '1'), 2);
      equal(_.lastIndexOf([1, 2, 3], 3, true), 2);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('indexOf methods');

  (function() {
    _.forEach(['indexOf', 'lastIndexOf'], function(methodName) {
      var func = _[methodName];

      test('`_.' + methodName + '` should accept a falsey `array` argument', 1, function() {
        var actual = [],
            expected = _.map(falsey, function() { return -1; });

        _.forEach(falsey, function(value, index) {
          try {
            actual.push(index ? func(value) : func());
          } catch(e) { }
        });

        deepEqual(actual, expected);
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.map');

  (function() {
    var array = [1, 2, 3];

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.map(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [1, 0, array]);
    });

    test('should support the `thisArg` argument', 2, function() {
      function callback(num, index) {
        return this[index];
      }

      var actual = _.map([1], callback, [2]);
      equal(actual, 2);

      actual = _.map({ 'a': 1 }, callback, { 'a': 2 });
      equal(actual, 2);
    });

    test('should iterate over own properties of objects', 1, function() {
      function Foo() { this.a = 1; }
      Foo.prototype.b = 2;

      var keys = _.map(new Foo, function(value, key) { return key; });
      deepEqual(keys, ['a']);
    });

    test('should work on an object with no `callback`', 1, function() {
      var actual = _.map({ 'a': 1, 'b': 2, 'c': 3 });
      deepEqual(actual, array);
    });

    test('should handle object arguments with non-numeric length properties', 1, function() {
      if (defineProperty) {
        var object = {};
        defineProperty(object, 'length', { 'value': 'x' });
        deepEqual(_.map(object, _.identity), []);
      } else {
        skipTest();
      }
    });

    test('should return a wrapped value when chaining', 1, function() {
      if (!isNpm) {
        ok(_(array).map(Boolean) instanceof _);
      }
      else {
        skipTest();
      }
    });

    test('should treat a nodelist as an array-like object', 1, function() {
      if (document) {
        var actual = _.map(document.getElementsByTagName('body'), function(element) {
          return element.nodeName.toLowerCase();
        });

        deepEqual(actual, ['body']);
      }
      else {
        skipTest();
      }
    });

    test('should accept a falsey `array` argument', 1, function() {
      var actual = [],
          expected = _.map(falsey, function() { return []; });

      _.forEach(falsey, function(value, index) {
        try {
          actual.push(index ? _.map(value) : _.map());
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should be aliased', 1, function() {
      strictEqual(_.collect, _.map);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.max');

  (function() {
    test('should return the largest value from a collection', 1, function() {
      equal(3, _.max([1, 2, 3]));
    });

    test('should return `-Infinity` for empty collections', 1, function() {
      var actual = [],
          expected = _.map(empties, function() { return -Infinity; });

      _.forEach(empties, function(value) {
        try {
          actual.push(_.max(value));
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should return `-Infinity` for non-numeric collection values', 1, function() {
      var actual = [],
          collections = [['a', 'b'], { 'a': 'a', 'b': 'b' }],
          expected = _.map(collections, function() { return -Infinity; });

      _.forEach(collections, function(value) {
        try {
          actual.push(_.max(value));
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.memoize');

  (function() {
    test('should memoize results based on the first argument passed', 2, function() {
      var memoized = _.memoize(function(a, b, c) {
        return a + b + c;
      });

      equal(memoized(1, 2, 3), 6);
      equal(memoized(1, 3, 5), 6);
    });

    test('should support a `resolver` argument', 2, function() {
      function func(a, b, c) {
        return a + b + c;
      }

      var memoized = _.memoize(func, func);
      equal(memoized(1, 2, 3), 6);
      equal(memoized(1, 3, 5), 9);
    });

    test('should not set a `this` binding', 2, function() {
      var memoized = _.memoize(function(a, b, c) {
        return a + this.b + this.c;
      });

      var object = { 'b': 2, 'c': 3, 'memoized': memoized };
      equal(object.memoized(1), 6);
      equal(object.memoized(2), 7);
    });

    test('should check cache for own properties', 1, function() {
      var actual = [],
          memoized = _.memoize(_.identity);

      _.each(shadowedProps, function(value) {
        actual.push(memoized(value));
      });

      deepEqual(actual, shadowedProps);
    });

    test('should expose a `cache` object on the `memoized` function', 2, function() {
      var memoized = _.memoize(_.identity, _.identity);

      memoized('x');
      equal(memoized.cache.x, 'x');

      memoized.cache.x = 'y';
      equal(memoized('x'), 'y');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.merge');

  (function() {
    var args = arguments;

    test('should merge `source` into the destination object', 1, function() {
      var names = {
        'characters': [
          { 'name': 'barney' },
          { 'name': 'fred' }
        ]
      };

      var ages = {
        'characters': [
          { 'age': 36 },
          { 'age': 40 }
        ]
      };

      var heights = {
        'characters': [
          { 'height': '5\'4"' },
          { 'height': '5\'5"' }
        ]
      };

      var expected = {
        'characters': [
          { 'name': 'barney', 'age': 36, 'height': '5\'4"' },
          { 'name': 'fred', 'age': 40, 'height': '5\'5"' }
        ]
      };

      deepEqual(_.merge(names, ages, heights), expected);
    });

    test('should merge sources containing circular references', 1, function() {
      var object = {
        'foo': { 'a': 1 },
        'bar': { 'a': 2 }
      };

      var source = {
        'foo': { 'b': { 'foo': { 'c': { } } } },
        'bar': { }
      };

      source.foo.b.foo.c = source;
      source.bar.b = source.foo.b;

      var actual = _.merge(object, source);
      ok(actual.bar.b === actual.foo.b && actual.foo.b.foo.c === actual.foo.b.foo.c.foo.b.foo.c);
    });

    test('should not treat `arguments` objects as plain objects', 1, function() {
      var object = {
        'args': args
      };

      var source = {
        'args': { '3': 4 }
      };

      var actual = _.merge(object, source);
      equal(_.isArguments(actual.args), false);
    });

    test('should work with four arguments', 1, function() {
      var expected = { 'a': 4 };
      deepEqual(_.merge({ 'a': 1 }, { 'a': 2 }, { 'a': 3 }, expected), expected);
    });

    test('should assign `null` values', 1, function() {
      var actual = _.merge({ 'a': 1 }, { 'a': null });
      strictEqual(actual.a, null);
    });

    test('should not assign `undefined` values', 1, function() {
      var actual = _.merge({ 'a': 1 }, { 'a': undefined });
      strictEqual(actual.a, 1);
    });

    test('should handle merging if `callback` returns `undefined`', 1, function() {
      var actual = _.merge({ 'a': { 'b': [1, 1] } }, { 'a': { 'b': [0] } }, function() {});
      deepEqual(actual, { 'a': { 'b': [0, 1] } });
    });

    test('should defer to `callback` when it returns a value other than `undefined`', 1, function() {
      var actual = _.merge({ 'a': { 'b': [0, 1] } }, { 'a': { 'b': [2] } }, function(a, b) {
        return _.isArray(a) ? a.concat(b) : undefined;
      });
      deepEqual(actual, { 'a': { 'b': [0, 1, 2] } });
    });

    test('should pass the correct values to `callback`', 1, function() {
      var argsList = [],
          array = [1, 2],
          object = { 'b': 2 };

      _.merge({ 'a': array }, { 'a': object }, function(a, b) {
        argsList.push(slice.call(arguments));
      });

      deepEqual(argsList, [[array, object], [undefined, 2]]);
    });
  }(1, 2, 3));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.min');

  (function() {
    test('should return the smallest value from a collection', 1, function() {
      equal(1, _.min([1, 2, 3]));
    });

    test('should return `Infinity` for empty collections', 1, function() {
      var actual = [],
          expected = _.map(empties, function() { return Infinity; });

      _.forEach(empties, function(value) {
        try {
          actual.push(_.min(value));
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should return `Infinity` for non-numeric collection values', 1, function() {
      var actual = [],
          collections = [['a', 'b'], { 'a': 'a', 'b': 'b' }],
          expected = _.map(collections, function() { return Infinity; });

      _.forEach(collections, function(value) {
        try {
          actual.push(_.min(value));
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.max and lodash.min');

  _.forEach(['max', 'min'], function(methodName) {
    var array = [1, 2, 3],
        func = _[methodName];

    test('`_.' + methodName + '` should work with Date objects', 1, function() {
      var now = new Date,
          past = new Date(0);

      equal(func([now, past]), methodName == 'max' ? now : past);
    });

    test('`_.' + methodName + '` should work with a `callback` argument', 1, function() {
      var actual = func(array, function(num) {
        return -num;
      });

      equal(actual, methodName == 'max' ? 1 : 3);
    });

    test('`_.' + methodName + '` should pass the correct `callback` arguments when iterating an array', 1, function() {
      var args;

      func(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [1, 0, array]);
    });

    test('`_.' + methodName + '` should pass the correct `callback` arguments when iterating an object', 1, function() {
      var args,
          object = { 'a': 1, 'b': 2 },
          firstKey = _.first(_.keys(object));

      var expected = firstKey == 'a'
        ? [1, 'a', object]
        : [2, 'b', object];

      func(object, function() {
        args || (args = slice.call(arguments));
      }, 0);

      deepEqual(args, expected);
    });

    test('`_.' + methodName + '`should support the `thisArg` argument', 1, function() {
      var actual = func(array, function(num, index) {
        return -this[index];
      }, array);

      equal(actual, methodName == 'max' ? 1 : 3);
    });

    test('`_.' + methodName + '` should iterate an object', 1, function() {
      var actual = func({ 'a': 1, 'b': 2, 'c': 3 });
      equal(actual, methodName == 'max' ? 3 : 1);
    });

    test('`_.' + methodName + '` should iterate a string', 2, function() {
      _.forEach(['abc', Object('abc')], function(value) {
        var actual = func(value);
        equal(actual, methodName == 'max' ? 'c' : 'a');
      });
    });

    test('`_.' + methodName + '` should resolve the correct value when provided an array containing only one value', 1, function() {
      if (!isNpm) {
        var actual = _([40])[methodName]().value();
        strictEqual(actual, 40);
      }
      else {
        skipTest();
      }
    });

    test('`_.' + methodName + '` should work with extremely large arrays', 1, function() {
      var array = _.range(0, 5e5);
      equal(func(array), methodName == 'max' ? 499999 : 0);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.mixin');

  (function() {
    test('should accept an `object` argument', 1, function() {
      var lodash = {};
      _.mixin(lodash, { 'a': function(a) { return a[0]; } });
      strictEqual(lodash.a(['a']), 'a');
    });

    test('should accept a function `object` argument', 1, function() {
      function lodash(value) {
        if (!(this instanceof lodash)) {
          return new lodash(value);
        }
        this.__wrapped__ = value;
      }

      _.mixin(lodash, { 'a': function(a) { return a[0]; } });
      strictEqual(lodash(['a']).a().__wrapped__, 'a');
    });

    test('should mixin `source` methods into lodash', 4, function() {
      if (!isNpm) {
        _.mixin({
          'a': 'a',
          'A': function(a) { return a.toUpperCase(); }
        });

        equal('a' in _, false);
        equal('a' in _.prototype, false);

        delete _.a;
        delete _.prototype.a;

        equal(_.A('a'), 'A');
        equal(_('a').A().value(), 'A');

        delete _.A;
        delete _.prototype.A;
      }
      else {
        skipTest(4);
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.omit');

  (function() {
    var args = arguments,
        object = { 'a': 1, 'b': 2 },
        expected = { 'b': 2 };

    test('should accept individual property names', 1, function() {
      deepEqual(_.omit(object, 'a'), expected);
    });

    test('should accept an array of property names', 1, function() {
      deepEqual(_.omit(object, ['a', 'c']), expected);
    });

    test('should accept mixes of individual and arrays of property names', 1, function() {
      deepEqual(_.omit(object, ['a'], 'c'), expected);
    });

    test('should iterate over inherited properties', 1, function() {
      function Foo() {}
      Foo.prototype = object;

      deepEqual(_.omit(new Foo, 'a'), expected);
    });

    test('should work with `arguments` objects as secondary arguments', 1, function() {
      deepEqual(_.omit(object, args), expected);
    });

    test('should work with an array `object` argument', 1, function() {
      deepEqual(_.omit([1, 2, 3], '0', '2'), { '1': 2 });
    });

    test('should work with a `callback` argument', 1, function() {
      var actual = _.omit(object, function(num) {
        return num === 1;
      });

      deepEqual(actual, expected);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args,
          lastKey = _.keys(object).pop();

      var expected = lastKey == 'b'
        ? [1, 'a', object]
        : [2, 'b', object];

      _.omit(object, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, expected);
    });

    test('should correctly set the `this` binding', 1, function() {
      var actual = _.omit(object, function(num) {
        return num === this.a;
      }, { 'a': 1 });

      deepEqual(actual, expected);
    });
  }('a'));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.once');

  (function() {
    test('should execute `func` once', 1, function() {
      var count = 0,
          func = _.once(function() { count++; });

      func();
      func();
      strictEqual(count, 1);
    });

    test('should not set a `this` binding', 1, function() {
      var func = _.once(function() { this.count++; }),
          object = { 'count': 0, 'once': func };

      object.once();
      object.once();
      strictEqual(object.count, 1);
    });

    test('should ignore recursive calls', 1, function() {
      var count = 0;

      var func = _.once(function() {
        count++;
        func();
      });

      func();
      strictEqual(count, 1);
    });

    test('should not throw more than once', 2, function() {
      var pass = true;

      var func = _.once(function() {
        throw new Error;
      });

      raises(function() { func(); }, Error);

      try {
        func();
      } catch(e) {
        pass = false;
      }
      ok(pass);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.parseInt');

  (function() {
    test('should parse strings with leading whitespace and zeros with a `radix` of 10 by default (test in Chrome, Firefox, and Opera)', 2, function() {
      var whitespace = ' \x09\x0B\x0C\xA0\ufeff\x0A\x0D\u2028\u2029\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000';
      equal(_.parseInt('08'), 8);
      equal(_.parseInt(whitespace + '08'), 8);
    });

    test('should use a radix of `10`, for non-hexadecimals, if `radix` is `undefined` or `0`', 3, function() {
      equal(_.parseInt('10', 0), 10);
      equal(_.parseInt('10'), 10);
      equal(_.parseInt('10', undefined), 10);
    });

    test('should use a radix of `16`, for hexadecimals, if `radix` is `undefined` or `0`', 3, function() {
      equal(_.parseInt('0x20', 0), 32);
      equal(_.parseInt('0x20'), 32);
      equal(_.parseInt('0x20', undefined), 32);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('partial methods');

  _.forEach(['partial', 'partialRight'], function(methodName) {
    var func = _[methodName];

    test('`_.' + methodName + '` partially applies without additional arguments', 1, function() {
      var arg = 'a',
          fn = function(x) { return x; };

      equal(func(fn, arg)(), arg);
    });

    test('`_.' + methodName + '` partially applies with additional arguments', 1, function() {
      var arg1 = 'a',
          arg2 = 'b',
          expected = [arg1, arg2],
          fn = function(x, y) { return [x, y]; };

      if (methodName == 'partialRight') {
        expected.reverse();
      }
      deepEqual(func(fn, arg1)(arg2), expected);
    });

    test('`_.' + methodName + '` works without partially applying arguments, without additional arguments', 1, function() {
      var fn = function() { return arguments.length; };
      strictEqual(func(fn)(), 0);
    });

    test('`_.' + methodName + '` works without partially applying arguments, with additional arguments', 1, function() {
      var arg = 'a',
          fn = function(x) { return x; };

      equal(func(fn)(arg), arg);
    });

    test('`_.' + methodName + '` should not alter the `this` binding', 3, function() {
      var object = { 'a': 1 },
          fn = function() { return this.a; };

      strictEqual(func(_.bind(fn, object))(), object.a);
      strictEqual(_.bind(func(fn), object)(), object.a);

      object.fn = func(fn);
      strictEqual(object.fn(), object.a);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.partialRight');

  (function() {
    test('should work as a deep `_.defaults`', 1, function() {
      var object = { 'a': { 'b': 1 } },
          source = { 'a': { 'b': 2, 'c': 3 } },
          expected = { 'a': { 'b': 1, 'c': 3 } };

      var deepDefaults = _.partialRight(_.merge, _.defaults);
      deepEqual(deepDefaults(object, source), expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('methods using `createBound`');

  (function() {
    test('combinations of partial functions should work', 1, function() {
      function func() {
        return slice.call(arguments);
      }
      var a = _.partial(func),
          b = _.partialRight(a, 3),
          c = _.partial(b, 1);

      deepEqual(c(2), [1, 2, 3]);
    });

    test('combinations of bound and partial functions should work', 3, function() {
      function func() {
        var result = [this.x];
        push.apply(result, arguments);
        return result;
      }
      var expected = [1, 2, 3, 4],
          object = { 'func': func, 'x': 1 };

      var a = _.bindKey(object, 'func'),
          b = _.partialRight(a, 4),
          c = _.partial(b, 2);

      deepEqual(c(3), expected);

      a = _.bind(func, object);
      b = _.partialRight(a, 4);
      c = _.partial(b, 2);

      deepEqual(c(3), expected);

      a = _.partial(func, 2);
      b = _.bind(a, object);
      c = _.partialRight(b, 4);

      deepEqual(c(3), expected);
    });

    test('recursively bound functions should work', 1, function() {
      function func() {
        return this.x;
      }
      var a = _.bind(func, { 'x': 1 }),
          b = _.bind(a, { 'x': 2 }),
          c = _.bind(b, { 'x': 3 });

      strictEqual(c(), 1);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.pick');

  (function() {
    var args = arguments,
        object = { 'a': 1, 'b': 2 },
        expected = { 'b': 2 };

    test('should iterate over inherited properties', 1, function() {
      function Foo() {}
      Foo.prototype = object;

      deepEqual(_.pick(new Foo, 'b'), expected);
    });

    test('should work with `arguments` objects as secondary arguments', 1, function() {
      deepEqual(_.pick(object, args), expected);
    });

    test('should work with an array `object` argument', 1, function() {
      deepEqual(_.pick([1, 2, 3], '1'), { '1': 2 });
    });

    test('should work with a `callback` argument', 1, function() {
      var actual = _.pick(object, function(num) {
        return num === 2;
      });

      deepEqual(actual, expected);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args,
          lastKey = _.keys(object).pop();

      var expected = lastKey == 'b'
        ? [1, 'a', object]
        : [2, 'b', object];

      _.pick(object, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, expected);
    });

    test('should correctly set the `this` binding', 1, function() {
      var actual = _.pick(object, function(num) {
        return num === this.b;
      }, { 'b': 2 });

      deepEqual(actual, expected);
    });
  }('b'));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.pluck');

  (function() {
    test('should return an array of property values from each element of a collection', 1, function() {
      var objects = [{ 'name': 'barney', 'age': 36 }, { 'name': 'fred', 'age': 40 }],
          actual = _.pluck(objects, 'name');

      deepEqual(actual, ['barney', 'fred']);
    });

    test('should work with an object for `collection`', 1, function() {
      var object = { 'a': [1], 'b': [1, 2], 'c': [1, 2, 3] };
      deepEqual(_.pluck(object, 'length'), [1, 2, 3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.pull');

  (function() {
    test('should modify and return the array', 2, function() {
      var array = [1, 2, 3],
          actual = _.pull(array, 1, 3);

      deepEqual(array, [2]);
      ok(actual === array);
    });

    test('should preserve holes in arrays', 2, function() {
      var array = [1, 2, 3, 4];
      delete array[1];
      delete array[3];

      _.pull(array, 1);
      equal(0 in array, false);
      equal(2 in array, false);
    });

    test('should treat holes as `undefined`', 1, function() {
      var array = [1, 2, 3];
      delete array[1];

      _.pull(array, undefined);
      deepEqual(array, [1, 3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.random');

  (function() {
    var array = Array(1000);

    test('should return `0` or `1` when arguments are not provided', 1, function() {
      var actual = _.random();
      ok(actual === 0 || actual === 1);
    });

    test('supports not passing a `max` argument', 1, function() {
      var actual = _.random(5),
          limit = 60,
          start = new Date;

      ok(_.some(array, function() {
        return _.random(5) != 5;
      }));
    });

    test('supports large integer values', 2, function() {
      var min = Math.pow(2, 31),
          max = Math.pow(2, 62);

      ok(_.every(array, function() {
        return _.random(min, max) >= min;
      }));

      ok(_.some(array, function() {
        return _.random(Number.MAX_VALUE) > 0;
      }));
    });

    test('should coerce arguments to numbers', 1, function() {
      strictEqual(_.random('1', '1'), 1);
    });

    test('should support floats', 2, function() {
      var min = 1.5,
          max = 1.6,
          actual = _.random(min, max);

      ok(actual % 1);
      ok(actual >= min && actual <= max);
    });

    test('supports passing a `floating` argument', 3, function() {
      var actual = _.random(true);
      ok(actual % 1 && actual >= 0 && actual <= 1);

      actual = _.random(2, true);
      ok(actual % 1 && actual >= 0 && actual <= 2);

      actual = _.random(2, 4, true);
      ok(actual % 1 && actual >= 2 && actual <= 4);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.range');

  (function() {
    var func = _.range;

    test('should work when passing a single `end` argument', 1, function() {
      deepEqual(_.range(4), [0, 1, 2, 3]);
    });

    test('should work when passing `start` and `end` arguments', 1, function() {
      deepEqual(_.range(1, 5), [1, 2, 3, 4]);
    });

    test('should work when passing `start`, `end`, and `step` arguments', 1, function() {
      deepEqual(_.range(0, 20, 5), [0, 5, 10, 15]);
    });

    test('should support a `step` of `0`', 1, function() {
      deepEqual(_.range(1, 4, 0), [1, 1, 1]);
    });

    test('should work when passing `step` larger than `end`', 1, function() {
      deepEqual(_.range(1, 5, 20), [1]);
    });

    test('should work when passing a negative `step` argument', 2, function() {
      deepEqual(_.range(0, -4, -1), [0, -1, -2, -3]);
      deepEqual(_.range(21, 10, -3), [21, 18, 15, 12]);
    });

    test('should treat falsey `start` arguments as `0`', 13, function() {
      _.forEach(falsey, function(value, index) {
        if (index) {
          deepEqual(_.range(value), []);
          deepEqual(_.range(value, 1), [0]);
        } else {
          deepEqual(_.range(), []);
        }
      });
    });

    test('should coerce arguments to numbers', 1, function() {
      var actual = [func('0',1), func('1'), func(0, 1, '1')];
      deepEqual(actual, [[0], [0], [0]]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.reduce');

  (function() {
    var array = [1, 2, 3];

    test('should use the first element of a collection as the default `accumulator`', 1, function() {
      strictEqual(_.reduce(array), 1);
    });

    test('should pass the correct `callback` arguments when iterating an array', 2, function() {
      var args;

      _.reduce(array, function() {
        args || (args = slice.call(arguments));
      }, 0);

      deepEqual(args, [0, 1, 0, array]);

      args = null;
      _.reduce(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [1, 2, 1, array]);
    });

    test('should pass the correct `callback` arguments when iterating an object', 2, function() {
      var args,
          object = { 'a': 1, 'b': 2 },
          firstKey = _.first(_.keys(object));

      var expected = firstKey == 'a'
        ? [0, 1, 'a', object]
        : [0, 2, 'b', object];

      _.reduce(object, function() {
        args || (args = slice.call(arguments));
      }, 0);

      deepEqual(args, expected);

      args = null;
      expected = firstKey == 'a'
        ? [1, 2, 'b', object]
        : [2, 1, 'a', object];

      _.reduce(object, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, expected);
    });

    _.forEach({
      'literal': 'abc',
      'object': Object('abc')
    },
    function(collection, key) {
      test('should work with a string ' + key + ' for `collection` (test in IE < 9)', 2, function() {
        var args;

        var actual = _.reduce(collection, function(accumulator, value) {
          args || (args = slice.call(arguments));
          return accumulator + value;
        });

        deepEqual(args, ['a', 'b', 1, collection]);
        equal(actual, 'abc');
      });
    });

    test('should be aliased', 2, function() {
      strictEqual(_.foldl, _.reduce);
      strictEqual(_.inject, _.reduce);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.reduceRight');

  (function() {
    var array = [1, 2, 3];

    test('should use the last element of a collection as the default `accumulator`', 1, function() {
      equal(_.reduceRight(array), 3);
    });

    test('should pass the correct `callback` arguments when iterating an array', 2, function() {
      var args;

      _.reduceRight(array, function() {
        args || (args = slice.call(arguments));
      }, 0);

      deepEqual(args, [0, 3, 2, array]);

      args = null;
      _.reduceRight(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [3, 2, 1, array]);
    });

    test('should pass the correct `callback` arguments when iterating an object', 2, function() {
      var args,
          object = { 'a': 1, 'b': 2 },
          lastKey = _.last(_.keys(object));

      var expected = lastKey == 'b'
        ? [0, 2, 'b', object]
        : [0, 1, 'a', object];

      _.reduceRight(object, function() {
        args || (args = slice.call(arguments));
      }, 0);

      deepEqual(args, expected);

      args = null;
      expected = lastKey == 'b'
        ? [2, 1, 'a', object]
        : [1, 2, 'b', object];

      _.reduceRight(object, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, expected);
    });

    _.forEach({
      'literal': 'abc',
      'object': Object('abc')
    },
    function(collection, key) {
      test('should work with a string ' + key + ' for `collection` (test in IE < 9)', 2, function() {
        var args;

        var actual = _.reduceRight(collection, function(accumulator, value) {
          args || (args = slice.call(arguments));
          return accumulator + value;
        });

        deepEqual(args, ['c', 'b', 1, collection]);
        equal(actual, 'cba');
      });
    });

    test('should be aliased', 1, function() {
      strictEqual(_.foldr, _.reduceRight);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('reduce methods');

  _.forEach(['reduce', 'reduceRight'], function(methodName) {
    var array = [1, 2, 3],
        func = _[methodName],
        noop = function() {};

    test('`_.' + methodName + '` should reduce a collection to a single value', 1, function() {
      var actual = func(['a', 'b', 'c'], function(accumulator, value) {
        return accumulator + value;
      }, '');

      equal(actual, methodName == 'reduce' ? 'abc' : 'cba');
    });

    test('`_.' + methodName + '` should support the `thisArg` argument', 1, function() {
      var actual = func(array, function(sum, num, index) {
        return sum + this[index];
      }, 0, array);

      deepEqual(actual, 6);
    });

    test('`_.' + methodName + '` should return an unwrapped value when chaining', 1, function() {
      if (!isNpm) {
        var actual = _(array)[methodName](function(sum, num) {
          return sum + num;
        });

        equal(actual, 6);
      }
      else {
        skipTest();
      }
    });

    test('`_.' + methodName + '` should support empty or falsey collections without an initial `accumulator` value', 1, function() {
      var actual = [],
          expected = _.map(empties, function() { return undefined; });

      _.forEach(empties, function(value) {
        try {
          actual.push(func(value, noop));
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('`_.' + methodName + '` should support empty or falsey collections with an initial `accumulator` value', 1, function() {
      var actual = [],
          expected = _.map(empties, function() { return 'x'; });

      _.forEach(empties, function(value) {
        try {
          actual.push(func(value, noop, 'x'));
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('`_.' + methodName + '` should handle an initial `accumulator` value of `undefined`', 1, function() {
      var actual = func([], noop, undefined);
      strictEqual(actual, undefined);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.reject');

  (function() {
    test('should return elements the `callback` returns falsey for', 1, function() {
      var actual = _.reject([1, 2, 3], function(num) {
        return num % 2;
      });

      deepEqual(actual, [2]);
    });
  }());


  /*--------------------------------------------------------------------------*/

  QUnit.module('filter methods');

  _.forEach(['filter', 'reject'], function(methodNames) {
    var func = _[methodNames];

    test('`_.' + methodNames + '` should not modify the resulting value from within `callback`', 1, function() {
      var actual = func([0], function(num, index, array) {
        array[index] = 1;
        return methodNames == 'filter';
      });

      deepEqual(actual, [0]);
    });
  });

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.remove');

  (function() {
    test('should modify the array and return removed elements', 2, function() {
      var array = [1, 2, 3];

      var actual = _.remove(array, function(num) {
        return num < 3;
      });

      deepEqual(array, [3]);
      deepEqual(actual, [1, 2]);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args,
          array = [1, 2, 3];

      _.remove(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [1, 0, array]);
    });

    test('should support the `thisArg` argument', 1, function() {
      var array = [1, 2, 3];

      var actual = _.remove(array, function(num, index) {
        return this[index] < 3;
      }, array);

      deepEqual(actual, [1, 2]);
    });

    test('should preserve holes in arrays', 2, function() {
      var array = [1, 2, 3, 4];
      delete array[1];
      delete array[3];

      _.remove(array, function(num) { return num === 1; });
      equal(0 in array, false);
      equal(2 in array, false);
    });

    test('should treat holes as `undefined`', 1, function() {
      var array = [1, 2, 3];
      delete array[1];

      _.remove(array, function(num) { return num == null; });
      deepEqual(array, [1, 3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.result');

  (function() {
    test('should resolve property values', 4, function() {
      var object = {
        'a': 1,
        'b': 2,
        'c': function(){ return this.b; }
      };

      strictEqual(_.result(object, 'a'), 1);
      strictEqual(_.result(object, 'b'), 2);
      strictEqual(_.result(object, 'c'), 2);
      strictEqual(_.result(object, 'd'), undefined);
    });

    test('should return `undefined` when provided a falsey `object` argument', 1, function() {
      var actual = [],
          expected = _.map(falsey, function() { return undefined; });

      _.forEach(falsey, function(value, index) {
        actual.push(index ? _.result(value) : _.result());
      });

      deepEqual(actual, expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.rest');

  (function() {
    var array = [1, 2, 3];

    var objects = [
      { 'a': 2, 'b': 2 },
      { 'a': 1, 'b': 1 },
      { 'a': 0, 'b': 0 }
    ];

    test('should accept a falsey `array` argument', 1, function() {
      var actual = [],
          expected = _.map(falsey, function() { return []; });

      _.forEach(falsey, function(value, index) {
        try {
          actual.push(index ? _.rest(value) : _.rest());
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should exclude the first element', 1, function() {
      deepEqual(_.rest(array), [2, 3]);
    });

    test('should exclude the first two elements', 1, function() {
      deepEqual(_.rest(array, 2), [3]);
    });

    test('should return all elements when `n` < `1`', 3, function() {
      _.forEach([0, -1, -2], function(n) {
        deepEqual(_.rest(array, n), [1, 2, 3]);
      });
    });

    test('should return an empty array when `n` >= `array.length`', 2, function() {
      _.forEach([3, 4], function(n) {
        deepEqual(_.rest(array, n), []);
      });
    });

    test('should return an empty when querying empty arrays', 1, function() {
      deepEqual(_.rest([]), []);
    });

    test('should work when used as `callback` for `_.map`', 1, function() {
      var array = [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          actual = _.map(array, _.rest);

      deepEqual(actual, [[2, 3], [5, 6], [8, 9]]);
    });

    test('should work with a `callback`', 1, function() {
      var actual = _.rest(array, function(num) {
        return num < 3;
      });

      deepEqual(actual, [3]);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.rest(array, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [1, 0, array]);
    });

    test('supports the `thisArg` argument', 1, function() {
      var actual = _.rest(array, function(num, index) {
        return this[index] < 3;
      }, array);

      deepEqual(actual, [3]);
    });

    test('should work with an object for `callback`', 1, function() {
      deepEqual(_.rest(objects, { 'b': 2 }), objects.slice(-2));
    });

    test('should work with a string for `callback`', 1, function() {
      deepEqual(_.rest(objects, 'b'), objects.slice(-1));
    });

    test('should be aliased', 2, function() {
      strictEqual(_.drop, _.rest);
      strictEqual(_.tail, _.rest);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.runInContext');

  (function() {
    test('should not require a fully populated `context` object', 1, function() {
      if (!isModularize) {
        var lodash = _.runInContext({
          'setTimeout': function(callback) {
            callback();
          }
        });

        var pass = false;
        lodash.delay(function() { pass = true; }, 32);
        ok(pass);
      }
      else {
        skipTest();
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.sample');

  (function() {
    var array = [1, 2, 3];

    test('should return a random element', 1, function() {
      var actual = _.sample(array);
      ok(_.contains(array, actual));
    });

    test('should return two random elements', 1, function() {
      var actual = _.sample(array, 2);
      ok(actual[0] !== actual[1] && _.contains(array, actual[0]) && _.contains(array, actual[1]));
    });

    test('should contain elements of the collection', 1, function() {
      var actual = _.sample(array, array.length);
      deepEqual(actual.sort(), array);
    });

    test('should return an empty array when `n` < `1`', 3, function() {
      _.forEach([0, -1, -2], function(n) {
        deepEqual(_.sample(array, n), []);
      });
    });

    test('should return all elements when `n` >= `array.length`', 2, function() {
      _.forEach([3, 4], function(n) {
        deepEqual(_.sample(array, n).sort(), array);
      });
    });

    test('should return `undefined` when sampling an empty array', 1, function() {
      strictEqual(_.sample([]), undefined);
    });

    test('should return an empty array for empty or falsey collections', 1, function() {
      var actual = [];

      var expected = _.transform(empties, function(result) {
        result.push([], []);
      });

      _.forEach(empties, function(value) {
        try {
          actual.push(_.shuffle(value), _.shuffle(value, 1));
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should sample an object', 2, function() {
      var object = { 'a': 1, 'b': 2, 'c': 3 },
          actual = _.sample(object);

      ok(_.contains(array, actual));

      actual = _.sample(object, 2);
      ok(actual[0] !== actual[1] && _.contains(array, actual[0]) && _.contains(array, actual[1]));
    });

    test('should work when used as `callback` for `_.map`', 1, function() {
      var a = [1, 2, 3],
          b = [4, 5, 6],
          c = [7, 8, 9],
          actual = _.map([a, b, c], _.sample);

      ok(_.contains(a, actual[0]) && _.contains(b, actual[1]) && _.contains(c, actual[2]));
    });

    test('should chain when passing `n`', 1, function() {
      if (!isNpm) {
        var actual = _(array).sample(2);
        ok(actual instanceof _);
      }
      else {
        skipTest();
      }
    });

    test('should not chain when arguments are not provided', 1, function() {
      if (!isNpm) {
        var actual = _(array).sample();
        ok(_.contains(array, actual));
      }
      else {
        skipTest();
      }
    });

    _.forEach({
      'literal': 'abc',
      'object': Object('abc')
    },
    function(collection, key) {
      test('should work with a string ' + key + ' for `collection`', 2, function() {
        var actual = _.sample(collection);
        ok(_.contains(collection, actual));

        actual = _.sample(collection, 2);
        ok(actual[0] !== actual[1] && _.contains(collection, actual[0]) && _.contains(collection, actual[1]));
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.shuffle');

  (function() {
    var array = [1, 2, 3],
        object = { 'a': 1, 'b': 2, 'c': 3 };

    test('should return a new array', 1, function() {
      notStrictEqual(_.shuffle(array), array);
    });

    test('should contain the same elements after a collection is shuffled', 2, function() {
      deepEqual(_.shuffle(array).sort(), array);
      deepEqual(_.shuffle(object).sort(), array);
    });

    test('should shuffle an object', 1, function() {
      var actual = _.shuffle(object);
      deepEqual(actual.sort(), array);
    });

    _.forEach({
      'literal': 'abc',
      'object': Object('abc')
    },
    function(collection, key) {
      test('should work with a string ' + key + ' for `collection`', 1, function() {
        var actual = _.shuffle(collection);
        deepEqual(actual.sort(), ['a','b', 'c']);
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.size');

  (function() {
    var args = arguments,
        array = [1, 2, 3];

    test('should return the number of own enumerable properties of an object', 1, function() {
      equal(_.size({ 'one': 1, 'two': 2, 'three': 3 }), 3);
    });

    test('should return the length of an array', 1, function() {
      equal(_.size(array), 3);
    });

    test('should accept a falsey `object` argument', 1, function() {
      var actual = [],
          expected = _.map(falsey, function() { return 0; });

      _.forEach(falsey, function(value, index) {
        try {
          actual.push(index ? _.size(value) : _.size());
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should work with jQuery/MooTools DOM query collections', 1, function() {
      function Foo(elements) { push.apply(this, elements); }
      Foo.prototype = { 'length': 0, 'splice': Array.prototype.splice };

      equal(_.size(new Foo(array)), 3);
    });

    test('should work with `arguments` objects (test in IE < 9)', 1, function() {
      if (!isPhantomPage) {
        equal(_.size(args), 3);
      } else {
        skipTest();
      }
    });

    test('fixes the JScript [[DontEnum]] bug (test in IE < 9)', 1, function() {
      equal(_.size(shadowedObject), 7);
    });

    _.forEach({
      'literal': 'abc',
      'object': Object('abc')
    },
    function(collection, key) {
      test('should work with a string ' + key + ' for `collection`', 1, function() {
        deepEqual(_.size(collection), 3);
      });
    });
  }(1, 2, 3));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.some');

  (function() {
    test('should return `false` for empty or falsey collections', 1, function() {
      var actual = [],
          expected = _.map(empties, function() { return false; });

      _.forEach(empties, function(value) {
        try {
          actual.push(_.some(value, _.identity));
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should return `true` if the callback returns truey for any element in the collection', 2, function() {
      strictEqual(_.some([false, 1, ''], _.identity), true);
      strictEqual(_.some([null, 'x', 0], _.identity), true);
    });

    test('should return `false` if the callback returns falsey for all elements in the collection', 2, function() {
      strictEqual(_.some([false, false, false], _.identity), false);
      strictEqual(_.some([null, 0, ''], _.identity), false);
    });

    test('should return `true` as soon as the `callback` result is truey', 1, function() {
      strictEqual(_.some([null, true, null], _.identity), true);
    });

    test('should use `_.identity` when no callback is provided', 2, function() {
      strictEqual(_.some([0, 1]), true);
      strictEqual(_.some([0, 0]), false);
    });

    test('should be aliased', 1, function() {
      strictEqual(_.any, _.some);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.sortBy');

  (function() {
    var objects = [
      { 'num': 991 },
      { 'num': 212 },
      { 'num': 11 },
      { 'num': 16 },
      { 'num': 74 },
      { 'num': 0 },
      { 'num': 1515 }
    ];

    test('should sort in ascending order', 1, function() {
      var actual = _.pluck(_.sortBy(objects, function(object) {
        return object.num;
      }), 'num');

      deepEqual(actual, [0, 11, 16, 74, 212, 991, 1515]);
    });

    test('should perform a stable sort (test in IE > 8, Opera, and V8)', 1, function() {
      function Pair(x, y) {
        this.x = x;
        this.y = y;
      }

      var collection = [
        new Pair(1, 1), new Pair(1, 2),
        new Pair(1, 3), new Pair(1, 4),
        new Pair(1, 5), new Pair(1, 6),
        new Pair(2, 1), new Pair(2, 2),
        new Pair(2, 3), new Pair(2, 4),
        new Pair(2, 5), new Pair(2, 6),
        new Pair(undefined, 1), new Pair(undefined, 2),
        new Pair(undefined, 3), new Pair(undefined, 4),
        new Pair(undefined, 5), new Pair(undefined, 6)
      ];

      var actual = _.sortBy(collection, function(pair) {
        return pair.x;
      });

      deepEqual(actual, collection);
    });

    test('should work with `undefined` values', 1, function() {
      var array = [undefined, 4, 1, undefined, 3, 2];
      deepEqual(_.sortBy(array, _.identity), [1, 2, 3, 4, undefined, undefined]);
    });

    test('should use `_.identity` when no `callback` is provided', 1, function() {
      var actual = _.sortBy([3, 2, 1]);
      deepEqual(actual, [1, 2, 3]);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.sortBy(objects, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [objects[0], 0, objects]);
    });

    test('should support the `thisArg` argument', 1, function() {
      var actual = _.sortBy([1, 2, 3], function(num) {
        return this.sin(num);
      }, Math);

      deepEqual(actual, [3, 1, 2]);
    });

    test('should work with a string for `callback`', 1, function() {
      var actual = _.pluck(_.sortBy(objects, 'num'), 'num');
      deepEqual(actual, [0, 11, 16, 74, 212, 991, 1515]);
    });

    test('should work with an object for `collection`', 1, function() {
      var actual = _.sortBy({ 'a': 1, 'b': 2, 'c': 3 }, function(num) {
        return Math.sin(num);
      });

      deepEqual(actual, [3, 1, 2]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.sortedIndex');

  (function() {
    var array = [20, 30, 50],
        objects = [{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }];

    test('should return the insert index of a given value', 2, function() {
      equal(_.sortedIndex(array, 40), 2);
      equal(_.sortedIndex(array, 30), 1);
    });

    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.sortedIndex(array, 40, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [40]);
    });

    test('should support the `thisArg` argument', 1, function() {
      var actual = _.sortedIndex(array, 40, function(num) {
        return this[num];
      }, { '20': 20, '30': 30, '40': 40 });

      strictEqual(actual, 2);
    });

    test('should work with a string for `callback`', 1, function() {
      var actual = _.sortedIndex(objects, { 'x': 40 }, 'x');
      equal(actual, 2);
    });

    test('supports arrays with lengths larger than `Math.pow(2, 31) - 1`', 1, function() {
      var length = Math.pow(2, 32) - 1,
          index = length - 1,
          array = Array(length),
          steps = 0;

      array[index] = index;
      _.sortedIndex(array, index, function() { steps++; });
      equal(steps, 33);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.support');

  (function() {
    test('should contain properties with boolean values', 1, function() {
      ok(_.every(_.values(_.support), _.isBoolean));
    });

    test('should not contain minified properties (test production builds)', 1, function() {
      var props = [
        'argsClass',
        'argsObject',
        'enumErrorProps',
        'enumPrototypes',
        'fastBind',
        'funcDecomp',
        'funcNames',
        'nodeClass',
        'nonEnumArgs',
        'nonEnumShadows',
        'ownLast',
        'spliceObjects',
        'unindexedChars'
      ];

      ok(!_.size(_.difference(_.keys(_.support), props)));
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.template');

  (function() {
    test('should use a `with` statement by default', 1, function() {
      var compiled = _.template('<%= index %><%= collection[index] %><% _.each(collection, function(value, index) { %><%= index %><% }); %>'),
          actual = compiled({ 'index': 1, 'collection': ['a', 'b', 'c'] });

      equal(actual, '1b012');
    });

    test('should interpolate data object properties', 1, function() {
      var compiled = _.template('<%= a %>BC');
      equal(compiled({ 'a': 'A' }), 'ABC');
    });

    test('should work correctly with `this` references', 2, function() {
      var compiled = _.template('a<%= this.b %>c');

      root.b = 'b';
      equal(compiled(), 'abc');
      delete root.b;

      var object = { 'b': 'B' };
      object.compiled = _.template('A<%= this.b %>C', null, { 'variable': 'obj' });
      equal(object.compiled(), 'ABC');
    });

    test('should work with backslashes', 1, function() {
      var compiled = _.template('<%= a %> \\b');
      equal(compiled({ 'a': 'A' }), 'A \\b');
    });

    test('should support escaped values in "interpolation" delimiters', 1, function() {
      var compiled = _.template('<%= a ? "a=\\"A\\"" : "" %>');
      equal(compiled({ 'a': true }), 'a="A"');
    });

    test('should evaluate JavaScript in "evaluate" delimiters', 1, function() {
      var compiled = _.template(
        '<ul><%\
        for (var key in collection) {\
          %><li><%= collection[key] %></li><%\
        } %></ul>'
      );

      var actual = compiled({ 'collection': { 'a': 'A', 'b': 'B' } });
      equal(actual, '<ul><li>A</li><li>B</li></ul>');
    });

    test('should work with escaped characters in string literals', 2, function() {
      var compiled = _.template('<% print("\'\\n\\r\\t\\u2028\\u2029\\\\") %>');
      equal(compiled(), "'\n\r\t\u2028\u2029\\");

      compiled = _.template('\'\n\r\t<%= a %>\u2028\u2029\\"');
      equal(compiled({ 'a': 'A' }), '\'\n\r\tA\u2028\u2029\\"');
    });

    test('should work with no delimiters', 1, function() {
      var expected = 'abc';
      equal(_.template(expected, {}), expected);
    });

    test('should work with statements containing quotes', 1, function() {
      var compiled = _.template("<%\
        if (a == 'A' || a == \"a\") {\
          %>'a',\"A\"<%\
        } %>"
      );

      equal(compiled({ 'a': 'A' }), "'a',\"A\"");
    });

    test('should escape values in "escape" delimiters', 1, function() {
      var escaped = '<p>&amp;&lt;&gt;&quot;&#39;\/</p>',
          unescaped = '&<>"\'\/';

      var compiled = _.template('<p><%- value %></p>');
      equal(compiled({ 'value': unescaped }), escaped);
    });

    test('should work with templates containing newlines and comments', 1, function() {
      var compiled = _.template('<%\n\
	// comment\n\
	if (value) { value += 3; }\n\
        %><p><%= value %></p>'
      );

      equal(compiled({ 'value': 3 }), '<p>6</p>');
    });

    test('should work with custom `_.templateSettings` delimiters', 1, function() {
      var settings = _.clone(_.templateSettings);

      _.templateSettings = {
        'escape': /\{\{-([\s\S]+?)\}\}/g,
        'evaluate': /\{\{([\s\S]+?)\}\}/g,
        'interpolate': /\{\{=([\s\S]+?)\}\}/g
      };

      var compiled = _.template('<ul>{{ _.each(collection, function(value, index) { }}<li>{{= index }}: {{- value }}</li>{{ }); }}</ul>'),
          expected = '<ul><li>0: a &amp; A</li><li>1: b &amp; B</li></ul>';

      equal(compiled({ 'collection': ['a & A', 'b & B'] }), expected);
      _.extend(_.templateSettings, settings);
    });

    test('should work with `_.templateSettings` delimiters containing special characters', 1, function() {
      var settings = _.clone(_.templateSettings);

      _.templateSettings = {
        'escape': /<\?-([\s\S]+?)\?>/g,
        'evaluate': /<\?([\s\S]+?)\?>/g,
        'interpolate': /<\?=([\s\S]+?)\?>/g
      };

      var compiled = _.template('<ul><? _.each(collection, function(value, index) { ?><li><?= index ?>: <?- value ?></li><? }); ?></ul>'),
          expected = '<ul><li>0: a &amp; A</li><li>1: b &amp; B</li></ul>';

      equal(compiled({ 'collection': ['a & A', 'b & B'] }), expected);
      _.extend(_.templateSettings, settings);
    });

    test('supports recursive calls', 1, function() {
      var compiled = _.template('<%= a %><% a = _.template(c, obj) %><%= a %>'),
          data = { 'a': 'A', 'b': 'B', 'c': '<%= b %>' };

      equal(compiled(data), 'AB');
    });

    test('should not modify `_.templateSettings` when `options` are provided', 2, function() {
      equal('a' in _.templateSettings, false);

      _.template('', {}, { 'a': 1 });
      equal('a' in _.templateSettings, false);

      delete _.templateSettings.a;
    });

    test('should not augment the `options` object', 1, function() {
      var options = {};
      _.template('', {}, options);
      deepEqual(options, {});
    });

    test('should provide the template source when a SyntaxError occurs', 1, function() {
      try {
        _.template('<% if x %>');
      } catch(e) {
        var source = e.source;
      }
      ok(/__p/.test(source));
    });

    test('should work with complex "interpolate" delimiters', 22, function() {
      _.forEach({
        '<%= a + b %>': '3',
        '<%= b - a %>': '1',
        '<%= a = b %>': '2',
        '<%= !a %>': 'false',
        '<%= ~a %>': '-2',
        '<%= a * b %>': '2',
        '<%= a / b %>': '0.5',
        '<%= a % b %>': '1',
        '<%= a >> b %>': '0',
        '<%= a << b %>': '4',
        '<%= a & b %>': '0',
        '<%= a ^ b %>': '3',
        '<%= a | b %>': '3',
        '<%= {}.toString.call(0) %>': '[object Number]',
        '<%= a.toFixed(2) %>': '1.00',
        '<%= obj["a"] %>': '1',
        '<%= delete a %>': 'true',
        '<%= "a" in obj %>': 'true',
        '<%= obj instanceof Object %>': 'true',
        '<%= new Boolean %>': 'false',
        '<%= typeof a %>': 'number',
        '<%= void a %>': ''
      },
      function(value, key) {
        var compiled = _.template(key),
            data = { 'a': 1, 'b': 2 };

        equal(compiled(data), value, key);
      });
    });

    test('should allow referencing variables declared in "evaluate" delimiters from other delimiters', 1, function() {
      var compiled = _.template('<% var b = a; %><%= b.value %>'),
          data = { 'a': { 'value': 1 } };

      strictEqual(compiled(data), '1');
    });

    test('should work when passing `options.variable`', 1, function() {
      var compiled = _.template(
        '<% _.forEach( data.a, function( value ) { %>' +
            '<%= value.valueOf() %>' +
        '<% }) %>', null, { 'variable': 'data' }
      );

      try {
        var data = { 'a': [1, 2, 3] };
        strictEqual(compiled(data), '123');
      } catch(e) {
        ok(false);
      }
    });

    test('should not error with IE conditional comments enabled (test with development build)', 1, function() {
      var compiled = _.template(''),
          pass = true;

      /*@cc_on @*/
      try {
        compiled();
      } catch(e) {
        pass = false;
      }
      ok(pass);
    });

    test('should tokenize delimiters', 1, function() {
      var compiled = _.template('<span class="icon-<%= type %>2"></span>'),
          data = { 'type': 1 };

      equal(compiled(data), '<span class="icon-12"></span>');
    });

    test('should work with "interpolate" delimiters containing ternary operators', 1, function() {
      var compiled = _.template('<%= value ? value : "b" %>'),
          data = { 'value': 'a' };

      equal(compiled(data), 'a');
    });

    test('should work with "interpolate" delimiters containing global values', 1, function() {
      var compiled = _.template('<%= typeof Math.abs %>');

      try {
        var actual = compiled();
      } catch(e) { }

      equal(actual, 'function');
    });

    test('should evaluate delimiters once', 1, function() {
      var actual = [],
          compiled = _.template('<%= func("a") %><%- func("b") %><% func("c") %>');

      compiled({ 'func': function(value) { actual.push(value); } });
      deepEqual(actual, ['a', 'b', 'c']);
    });

    test('should parse delimiters with newlines', 1, function() {
      var expected = '<<\nprint("<p>" + (value ? "yes" : "no") + "</p>")\n>>',
          compiled = _.template(expected, null, { 'evaluate': /<<(.+?)>>/g }),
          data = { 'value': true };

      equal(compiled(data), expected);
    });

    test('should parse ES6 template delimiters', 2, function() {
      var data = { 'value': 2 };
      strictEqual(_.template('1${value}3', data), '123');
      equal(_.template('${"{" + value + "\\}"}', data), '{2}');
    });

    test('supports the "imports" option', 1, function() {
      var options = { 'imports': { 'a': 1 } },
          compiled = _.template('<%= a %>', null, options);

      strictEqual(compiled({}), '1');
    });

    test('should coerce `text` argument to a string', 1, function() {
      var data = { 'a': 1 },
          object = { 'toString': function() { return '<%= a %>'; } };

      strictEqual(_.template(object, data), '1');
    });

    test('should handle \\u2028 & \\u2029 characters', 1, function() {
      var compiled = _.template('\u2028<%= "\\u2028\\u2029" %>\u2029');
      strictEqual(compiled(), '\u2028\u2028\u2029\u2029');
    });

    test('should resolve `null` and `undefined` values to empty strings', 4, function() {
      var compiled = _.template('<%= a %><%- a %>');
      strictEqual(compiled({ 'a': null }), '');
      strictEqual(compiled({ 'a': undefined }), '');

      compiled = _.template('<%= a.b %><%- a.b %>');
      strictEqual(compiled({ 'a': {} }), '');
      strictEqual(compiled({ 'a': {} }), '');
    });

    test('should support single line comments in "evaluate" delimiters (test production builds)', 1, function() {
      var compiled = _.template('<% // comment %><% if (value) { %>yap<% } else { %>nope<% } %>');
      equal(compiled({ 'value': true }), 'yap');
    });

    test('should match delimiters before escaping text', 1, function() {
      var compiled = _.template('<<\n a \n>>', null, { 'evaluate': /<<(.*?)>>/g });
      equal(compiled(), '<<\n a \n>>');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.throttle');

  (function() {
    asyncTest('should throttle a function', 2, function() {
      if (!(isRhino && isModularize)) {
        var count = 0;
        var throttled = _.throttle(function() { count++; }, 32);

        throttled();
        throttled();
        throttled();

        equal(count, 1);

        setTimeout(function() {
          equal(count, 2);
          QUnit.start();
        }, 64);
      }
      else {
        skipTest(2);
      }
    });

    asyncTest('subsequent calls should return the result of the first call', 2, function() {
      if (!(isRhino && isModularize)) {
        var throttled = _.throttle(function(value) { return value; }, 32),
            result = [throttled('x'), throttled('y')];

        deepEqual(result, ['x', 'x']);

        setTimeout(function() {
          var result = [throttled('a'), throttled('b')];
          deepEqual(result, ['a', 'a']);
          QUnit.start();
        }, 64);
      }
      else {
        skipTest(2);
      }
    });

    test('should clear timeout when `func` is called', 1, function() {
      if (!isModularize) {
        var callCount = 0,
            dateCount = 0;

        var lodash = _.runInContext(_.assign({}, root, {
          'Date': function() {
            return ++dateCount < 3 ? new Date : Object(Infinity);
          }
        }));

        var throttled = lodash.throttle(function() {
          callCount++;
        }, 32);

        throttled();
        throttled();
        throttled();

        equal(callCount, 2);
      }
      else {
        skipTest();
      }
    });

    asyncTest('supports recursive calls', 2, function() {
      if (!(isRhino && isModularize)) {
        var count = 0;
        var throttled = _.throttle(function() {
          count++;
          if (count < 10) {
            throttled();
          }
        }, 32);

        throttled();
        equal(count, 1);

        setTimeout(function() {
          ok(count < 3)
          QUnit.start();
        }, 32);
      }
      else {
        skipTest(2);
        QUnit.start();
      }
    });

    asyncTest('should not trigger a trailing call when invoked once', 2, function() {
      if (!(isRhino && isModularize)) {
        var count = 0,
            throttled = _.throttle(function() { count++; }, 32);

        throttled();
        equal(count, 1);

        setTimeout(function() {
          equal(count, 1);
          QUnit.start();
        }, 96);
      }
      else {
        skipTest(2);
        QUnit.start();
      }
    });

    _.times(2, function(index) {
      asyncTest('should trigger trailing call when invoked repeatedly' + (index ? ' and `leading` is `false`' : ''), 2, function() {
        if (!(isRhino && isModularize)) {
          var count = 0,
              limit = 160,
              options = index ? { 'leading': false } : {},
              throttled = _.throttle(function() { count++; }, 64, options),
              start = new Date;

          while ((new Date - start) < limit) {
            throttled();
          }
          var lastCount = count;
          ok(count > 1);

          setTimeout(function() {
            ok(count > lastCount);
            QUnit.start();
          }, 96);
        }
        else {
          skipTest(2);
          QUnit.start();
        }
      });
    });

    asyncTest('should apply default options correctly', 3, function() {
      if (!(isRhino && isModularize)) {
        var count = 0;

        var throttled = _.throttle(function(value) {
          count++;
          return value;
        }, 32, {});

        _.times(2, function() {
          equal(throttled('x'), 'x');
        });

        setTimeout(function() {
          strictEqual(count, 2);
          QUnit.start();
        }, 64);
      }
      else {
        skipTest(3);
        QUnit.start();
      }
    });

    test('should work with `leading` option', 4, function() {
      if (!(isRhino && isModularize)) {
        _.forEach([true, { 'leading': true }], function(options) {
          var withLeading = _.throttle(_.identity, 32, options);
          equal(withLeading('x'), 'x');
        });

        _.forEach([false, { 'leading': false }], function(options) {
          var withoutLeading = _.throttle(_.identity, 32, options);
          strictEqual(withoutLeading('x'), undefined);
        });
      }
      else {
        skipTest(4);
      }
    });

    asyncTest('should work with `trailing` option', 6, function() {
      if (!(isRhino && isModularize)) {
        var withCount = 0,
            withoutCount = 0;

        var withTrailing = _.throttle(function(value) {
          withCount++;
          return value;
        }, 32, { 'trailing': true });

        var withoutTrailing = _.throttle(function(value) {
          withoutCount++;
          return value;
        }, 32, { 'trailing': false });

        _.times(2, function() {
          equal(withTrailing('x'), 'x');
          equal(withoutTrailing('x'), 'x');
        });

        setTimeout(function() {
          equal(withCount, 2);
          strictEqual(withoutCount, 1);
          QUnit.start();
        }, 64);
      }
      else {
        skipTest(6);
        QUnit.start();
      }
    });

    asyncTest('should not update `lastCalled`, at the end of the timeout, when `trailing` is `false`', 1, function() {
      if (!(isRhino && isModularize)) {
        var count = 0;

        var throttled = _.throttle(function() {
          count++;
        }, 64, { 'trailing': false });

        _.times(2, throttled);
        setTimeout(function() { _.times(2, throttled); }, 100);

        setTimeout(function() {
          equal(count, 2);
          QUnit.start();
        }, 128);
      }
      else {
        skipTest();
        QUnit.start();
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.toArray');

  (function() {
    var args = arguments,
        array = [1, 2, 3];

    test('should return a dense array', 3, function() {
      var sparse = Array(3);
      sparse[1] = 2;

      var actual = _.toArray(sparse);

      ok(0 in actual);
      ok(2 in actual);
      deepEqual(actual, sparse);
    });

    test('should treat array-like objects like arrays', 2, function() {
      var object = { '0': 'a', '1': 'b', '2': 'c', 'length': 3 };
      deepEqual(_.toArray(object), ['a', 'b', 'c']);
      deepEqual(_.toArray(args), array);
    });

    test('should return a shallow clone of arrays', 2, function() {
      var actual = _.toArray(array);
      notStrictEqual(actual, array);
      deepEqual(_.toArray(array), array);
    });

    test('should return the values of objects', 1, function() {
      var object = { 'a': 1, 'b': 2, 'c': 3 };
      deepEqual(_.toArray(object), array);
    });

    test('should work with a string for `collection` (test in Opera < 10.52)', 2, function() {
      deepEqual(_.toArray('abc'), ['a', 'b', 'c']);
      deepEqual(_.toArray(Object('abc')), ['a', 'b', 'c']);
    });

    test('should work with a node list for `collection` (test in IE < 9)', 1, function() {
      if (document) {
        try {
          var nodeList = document.getElementsByTagName('body'),
              actual = _.toArray(nodeList);
        } catch(e) { }
        deepEqual(actual, [body]);
      } else {
        skipTest();
      }
    });
  }(1, 2, 3));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.times');

  (function() {
    test('should pass the correct `callback` arguments', 1, function() {
      var args;

      _.times(1, function() {
        args || (args = slice.call(arguments));
      });

      deepEqual(args, [0]);
    });

    test('should support the `thisArg` argument', 1, function() {
      var expect = [1, 2, 3];

      var actual = _.times(3, function(num) {
        return this[num];
      }, expect);

      deepEqual(actual, expect);
    });

    test('should use `_.identity` when no `callback` is provided', 1, function() {
      var actual = _.times(3);
      deepEqual(actual, [0, 1, 2]);
    });

    test('should return an array of the results of each `callback` execution', 1, function() {
      deepEqual(_.times(3, function(n) { return n * 2; }), [0, 2, 4]);
    });

    test('should return an empty array for falsey and negative `n` arguments', 1, function() {
      var actual = [],
          values = falsey.concat(-1, -Infinity),
          expected = _.map(values, function() { return []; });

      _.forEach(values, function(value, index) {
        actual.push(index ? _.times(value) : _.times());
      });

      deepEqual(actual, expected);
    });

    test('should return a wrapped value when chaining', 2, function() {
      if (!isNpm) {
        var actual = _(3).times();
        ok(actual instanceof _);
        deepEqual(actual.value(), [0, 1, 2]);
      }
      else {
        skipTest(2);
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.transform');

  (function() {
    test('should produce an that is an instance of the given object\'s constructor', 2, function() {
      function Foo() {
        this.a = 1;
        this.b = 2;
        this.c = 3;
      }

      var actual = _.transform(new Foo, function(result, value, key) {
        result[key] = value * value;
      });

      ok(actual instanceof Foo);
      deepEqual(_.clone(actual), { 'a': 1, 'b': 4, 'c': 9 });
    });

    test('should treat sparse arrays as dense', 1, function() {
      var actual = _.transform(Array(1), function(result, value, index) {
        result[index] = String(value);
      });

      deepEqual(actual, ['undefined']);
    });

    test('should work without a `callback` argument', 1, function() {
      function Foo() {}
      ok(_.transform(new Foo) instanceof Foo);
    });

    _.forEach({
      'array': [1, 2, 3],
      'object': { 'a': 1, 'b': 2, 'c': 3 }
    },
    function(object, key) {
      test('should pass the correct `callback` arguments when transforming an ' + key, 2, function() {
        var args;

        _.transform(object, function() {
          args || (args = slice.call(arguments));
        });

        var first = args[0];
        if (key == 'array') {
          ok(first != object && _.isArray(first));
          deepEqual(args, [first, 1, 0, object]);
        } else {
          ok(first != object && _.isPlainObject(first));
          deepEqual(args, [first, 1, 'a', object]);
        }
      });

      test('should support the `thisArg` argument when transforming an ' + key, 2, function() {
        var actual = _.transform(object, function(result, value, key) {
          result[key] = this[key];
        }, null, object);

        notStrictEqual(actual, object);
        deepEqual(actual, object);
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.unescape');

  (function() {
    var escaped = '&amp;&lt;&gt;&quot;&#39;\/',
        unescaped = '&<>"\'\/';

    test('should unescape entities in the correct order', 1, function() {
      equal(_.unescape('&amp;lt;'), '&lt;');
    });

    test('should unescape the proper entities', 1, function() {
      equal(_.unescape(escaped), unescaped);
    });

    test('should unescape the same characters escaped by `_.escape`', 1, function() {
      equal(_.unescape(_.escape(unescaped)), unescaped);
    });

    test('should return an empty string when provided `null` or `undefined`', 2, function() {
      equal(_.unescape(null), '');
      equal(_.unescape(undefined), '');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.union');

  (function() {
    test('should return the union of the given arrays', 1, function() {
      var actual = _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
      deepEqual(actual, [1, 2, 3, 101, 10]);
    });

    test('should not flatten nested arrays', 1, function() {
      var actual = _.union([1, 2, 3], [1, [4]], [2, [5]]);
      deepEqual(actual, [1, 2, 3, [4], [5]]);
    });

    test('should produce correct results when provided a falsey `array` argument', 1, function() {
      var expected = [1, 2, 3],
          actual = _.union(null, expected);

      deepEqual(actual, expected);
    });

    test('should not accept individual secondary values', 1, function() {
      deepEqual(_.union([1], 1, 2, 3), [1]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.uniq');

  (function() {
    var objects = [{ 'a': 2 }, { 'a': 3 }, { 'a': 1 }, { 'a': 2 }, { 'a': 3 }, { 'a': 1 }];

    test('should return unique values of an unsorted array', 1, function() {
      var array = [2, 3, 1, 2, 3, 1];
      deepEqual(_.uniq(array), [2, 3, 1]);
    });

    test('should return unique values of a sorted array', 1, function() {
      var array = [1, 1, 2, 2, 3];
      deepEqual(_.uniq(array), [1, 2, 3]);
    });

    test('should work with a `callback`', 1, function() {
      var actual = _.uniq(objects, false, function(object) {
        return object.a;
      });

      deepEqual(actual, objects.slice(0, 3));
    });

    test('should work with a `callback` without specifying `isSorted`', 1, function() {
      var actual = _.uniq(objects, function(object) {
        return object.a;
      });

      deepEqual(actual, objects.slice(0, 3));
    });

    test('should support the `thisArg` argument', 1, function() {
      var actual = _.uniq([1, 2, 1.5, 3, 2.5], function(num) {
        return this.floor(num);
      }, Math);

      deepEqual(actual, [1, 2, 3]);
    });

    test('should perform an unsorted uniq operation when used as `callback` for `_.map`', 1, function() {
      var array = [[2, 1, 2], [1, 2, 1]],
          actual = _.map(array, _.uniq);

      deepEqual(actual, [[2, 1], [1, 2]]);
    });

    test('should work with large arrays of boolean, `null`, and `undefined` values', 1, function() {
      var array = [],
          expected = [true, false, null, undefined],
          count = Math.ceil(largeArraySize / expected.length);

      _.times(count, function() {
        push.apply(array, expected);
      });
      deepEqual(_.uniq(array), expected);
    });

    test('should distinguish between numbers and numeric strings', 1, function() {
      var array = [],
          expected = ['2', 2, Object('2'), Object(2)],
          count = Math.ceil(largeArraySize / expected.length);

      _.times(count, function() {
        push.apply(array, expected);
      });

      deepEqual(_.uniq(array), expected);
    });

    _.forEach({
      'an object': ['a'],
      'a number': 0,
      'a string': '0'
    },
    function(callback, key) {
      test('should work with ' + key + ' for `callback`', 1, function() {
        var actual = _.uniq([['a'], ['b'], ['a']], callback);
        deepEqual(actual, [['a'], ['b']]);
      });
    });

    test('should be aliased', 1, function() {
      strictEqual(_.unique, _.uniq);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.uniqueId');

  (function() {
    test('should generate unique ids', 1, function() {
      var actual = [];
      _.times(1000, function() {
        actual.push(_.uniqueId());
      });

      equal(_.uniq(actual).length, actual.length);
    });

    test('should return a string value when not passing a prefix argument', 1, function() {
      equal(typeof _.uniqueId(), 'string');
    });

    test('should coerce the prefix argument to a string', 1, function() {
      var actual = [_.uniqueId(3), _.uniqueId(2), _.uniqueId(1)];
      ok(/3\d+,2\d+,1\d+/.test(actual));
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.where');

  (function() {
    var array = [
      { 'a': 1 },
      { 'a': 1 },
      { 'a': 1, 'b': 2 },
      { 'a': 2, 'b': 2 },
      { 'a': 3 }
    ];

    test('should filter by properties', 6, function() {
      deepEqual(_.where(array, { 'a': 1 }), [{ 'a': 1 }, { 'a': 1 }, { 'a': 1, 'b': 2 }]);
      deepEqual(_.where(array, { 'a': 2 }), [{ 'a': 2, 'b': 2 }]);
      deepEqual(_.where(array, { 'a': 3 }), [{ 'a': 3 }]);
      deepEqual(_.where(array, { 'b': 1 }), []);
      deepEqual(_.where(array, { 'b': 2 }), [{ 'a': 1, 'b': 2 }, { 'a': 2, 'b': 2 }]);
      deepEqual(_.where(array, { 'a': 1, 'b': 2 }), [{ 'a': 1, 'b': 2 }]);
    });

    test('should not filter by inherited properties', 1, function() {
      function Foo() {}
      Foo.prototype = { 'a': 2 };

      var properties = new Foo;
      properties.b = 2;
      deepEqual(_.where(array, properties), [{ 'a': 1, 'b': 2 }, { 'a': 2, 'b': 2 }]);
    });

    test('should filter by problem JScript properties (test in IE < 9)', 1, function() {
      var collection = [shadowedObject];
      deepEqual(_.where(collection, shadowedObject), [shadowedObject]);
    });

    test('should work with an object for `collection`', 1, function() {
      var collection = {
        'x': { 'a': 1 },
        'y': { 'a': 3 },
        'z': { 'a': 1, 'b': 2 }
      };

      deepEqual(_.where(collection, { 'a': 1 }), [{ 'a': 1 }, { 'a': 1, 'b': 2 }]);
    });

    test('should return an empty array when provided an empty `properties` object', 1, function() {
      deepEqual(_.where(array, {}), []);
    });

    test('should deep compare `properties` values', 1, function() {
      var collection = [{ 'a': { 'b': { 'c': 1, 'd': 2 }, 'e': 3 }, 'f': 4 }],
          expected = _.cloneDeep(collection);

      deepEqual(_.where(collection, { 'a': { 'b': { 'c': 1 } } }), expected);
    });

    test('should search of arrays for values', 2, function() {
      var collection = [{ 'a': [1, 2] }],
          expected = _.cloneDeep(collection);

      deepEqual(_.where(collection, { 'a': [] }), []);
      deepEqual(_.where(collection, { 'a': [2] }), expected);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.without');

  (function() {
    test('should use strict equality to determine the values to reject', 2, function() {
      var object1 = { 'a': 1 },
          object2 = { 'b': 2 },
          array = [object1, object2];

      deepEqual(_.without(array, { 'a': 1 }), array);
      deepEqual(_.without(array, object1), [object2]);
    });

    test('should remove all occurrences of each value from an array', 1, function() {
      var array = [1, 2, 3, 1, 2, 3];
      deepEqual(_.without(array, 1, 2), [3, 3]);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.wrap');

  (function() {
    test('should create a wrapped function', 1, function() {
      var p = _.wrap(_.escape, function(func, text) {
        return '<p>' + func(text) + '</p>';
      });

      equal(p('Fred, Wilma, & Pebbles'), '<p>Fred, Wilma, &amp; Pebbles</p>');
    });

    test('should pass the correct `wrapper` arguments', 1, function() {
      var args;

      var wrapped = _.wrap(_.noop, function() {
        args || (args = slice.call(arguments));
      });

      wrapped(1, 2, 3);
      deepEqual(args, [_.noop, 1, 2, 3]);
    });

    test('should not set a `this` binding', 1, function() {
      var p = _.wrap(_.escape, function(func) {
        return '<p>' + func(this.text) + '</p>';
      });

      var object = { 'p': p, 'text': 'Fred, Wilma, & Pebbles' };
      equal(object.p(), '<p>Fred, Wilma, &amp; Pebbles</p>');
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.zip');

  (function() {
    var object = {
      'an empty array': [
        [],
        []
      ],
      '0-tuples': [
        [[], []],
        []
      ],
      '2-tuples': [
        [['barney', 'fred'], [36, 40]],
        [['barney', 36], ['fred', 40]]
      ],
      '3-tuples': [
        [['barney', 'fred'], [36, 40], [true, false]],
        [['barney', 36, true], ['fred', 40, false]]
      ]
    };

    _.forOwn(object, function(pair, key) {
      test('should work with ' + key, 2, function() {
        var actual = _.zip.apply(_, pair[0]);
        deepEqual(actual, pair[1]);
        deepEqual(_.zip.apply(_, actual), actual.length ? pair[0] : []);
      });
    });

    test('should work with tuples of different lengths', 4, function() {
      var pair = [
        [['barney', 36], ['fred', 40, false]],
        [['barney', 'fred'], [36, 40], [undefined, false]]
      ];

      var actual = _.zip(pair[0]);
      ok(0 in actual[2]);
      deepEqual(actual, pair[1]);

      actual = _.zip.apply(_, actual);
      ok(2 in actual[0]);
      deepEqual(actual, [['barney', 36, undefined], ['fred', 40, false]]);
    });

    test('should support consuming it\'s return value', 1, function() {
      var expected = [['barney', 'fred'], [36, 40]];
      deepEqual(_.zip(_.zip(_.zip(_.zip(expected)))), expected);
    });

    test('should be aliased', 1, function() {
      strictEqual(_.unzip, _.zip);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash.zipObject');

  (function() {
    var object = { 'barney': 36, 'fred': 40 },
        array = [['barney', 36], ['fred', 40]];

    test('should skip falsey elements in a given two dimensional array', 1, function() {
      var actual = _.zipObject(array.concat(falsey));
      deepEqual(actual, object);
    });

    test('should zip together key/value arrays into an object', 1, function() {
      var actual = _.zipObject(['barney', 'fred'], [36, 40]);
      deepEqual(actual, object);
    });

    test('should accept a two dimensional array', 1, function() {
      var actual = _.zipObject(array);
      deepEqual(actual, object);
    });

    test('should accept a falsey `array` argument', 1, function() {
      var actual = [],
          expected = _.map(falsey, function() { return {}; });

      _.forEach(falsey, function(value, index) {
        try {
          actual.push(index ? _.zipObject(value) : _.zipObject());
        } catch(e) { }
      });

      deepEqual(actual, expected);
    });

    test('should support consuming the return value of `_.pairs`', 1, function() {
      deepEqual(_.zipObject(_.pairs(object)), object);
    });

    test('should be aliased', 1, function() {
      strictEqual(_.object, _.zipObject);
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash(...).shift');

  (function() {
    test('should remove the value at index `0` when length is `0` (test in IE 8 compatibility mode)', 2, function() {
      if (!isNpm) {
        var wrapped = _({ '0': 1, 'length': 1 });
        wrapped.shift();

        deepEqual(wrapped.keys().value(), ['length']);
        equal(wrapped.first(), undefined);
      }
      else {
        skipTest(2);
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash(...).splice');

  (function() {
    test('should remove the value at index `0` when length is `0` (test in IE < 9, and in compatibility mode for IE9)', 2, function() {
      if (!isNpm) {
        var wrapped = _({ '0': 1, 'length': 1 });
        wrapped.splice(0, 1);

        deepEqual(wrapped.keys().value(), ['length']);
        equal(wrapped.first(), undefined);
      }
      else {
        skipTest(2);
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash(...).toString');

  (function() {
    test('should return the `toString` result of the wrapped value', 1, function() {
      if (!isNpm) {
        var wrapped = _([1, 2, 3]);
        equal(String(wrapped), '1,2,3');
      }
      else {
        skipTest();
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash(...).valueOf');

  (function() {
    test('should return the `valueOf` result of the wrapped value', 1, function() {
      if (!isNpm) {
        var wrapped = _(123);
        equal(Number(wrapped), 123);
      }
      else {
        skipTest();
      }
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash(...) methods that return wrapped values');

  (function() {
    var array = [1, 2, 3],
        wrapped = _(array);

    var funcs = [
      'concat',
      'splice'
    ];

    _.forEach(funcs, function(methodName) {
      test('`_.' + methodName + '` should return a wrapped value', 1, function() {
        if (!isNpm) {
          ok(wrapped[methodName]() instanceof _);
        }
        else {
          skipTest();
        }
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash(...) methods that return unwrapped values');

  (function() {
    var array = [1, 2, 3],
        wrapped = _(array);

    var funcs = [
      'clone',
      'contains',
      'every',
      'find',
      'first',
      'has',
      'isArguments',
      'isArray',
      'isBoolean',
      'isDate',
      'isElement',
      'isEmpty',
      'isEqual',
      'isFinite',
      'isFunction',
      'isNaN',
      'isNull',
      'isNumber',
      'isObject',
      'isPlainObject',
      'isRegExp',
      'isString',
      'isUndefined',
      'join',
      'last',
      'pop',
      'shift',
      'reduce',
      'reduceRight',
      'some'
    ];

    _.forEach(funcs, function(methodName) {
      test('`_(...).' + methodName + '` should return an unwrapped value', 1, function() {
        if (!isNpm) {
          var actual = methodName == 'reduceRight'
            ? wrapped[methodName](_.identity)
            : wrapped[methodName]();

          equal(actual instanceof _, false);
        }
        else {
          skipTest();
        }
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash(...) methods capable of returning wrapped and unwrapped values');

  (function() {
    var array = [1, 2, 3],
        wrapped = _(array);

    var funcs = [
      'first',
      'last',
      'sample'
    ];

    _.forEach(funcs, function(methodName) {
      test('`_(...).' + methodName + '` called without an `n` argument should return an unwrapped value', 1, function() {
        if (!isNpm) {
          equal(typeof wrapped[methodName](), 'number');
        }
        else {
          skipTest();
        }
      });

      test('`_(...).' + methodName + '` called with an `n` argument should return a wrapped value', 1, function() {
        if (!isNpm) {
          ok(wrapped[methodName](1) instanceof _);
        }
        else {
          skipTest();
        }
      });

      test('`_.' + methodName + '` should return `undefined` when querying falsey arguments without an `n` argument', 1, function() {
        if (!isNpm) {
          var actual = [],
              expected = _.map(falsey, function() { return undefined; }),
              func = _[methodName];

          _.forEach(falsey, function(value, index) {
            try {
              actual.push(index ? func(value) : func());
            } catch(e) { }
          });

          deepEqual(actual, expected);
        }
        else {
          skipTest();
        }
      });

      test('`_.' + methodName + '` should return an empty array when querying falsey arguments with an `n` argument', 1, function() {
        if (!isNpm) {
          var actual = [],
              expected = _.map(falsey, function() { return []; }),
              func = _[methodName];

          _.forEach(falsey, function(value, index) {
            try {
              actual.push(func(value, 2));
            } catch(e) { }
          });

          deepEqual(actual, expected);
        }
        else {
          skipTest();
        }
      });
    });
  }());

  /*--------------------------------------------------------------------------*/

  QUnit.module('"Arrays" category methods');

 (function() {
    var args = arguments,
        array = [1, 2, 3, 4, 5, 6];

    test('should work with `arguments` objects', 23, function() {
      function message(methodName) {
        return '`_.' + methodName + '` should work with `arguments` objects';
      }

      deepEqual(_.at(args, 0, 4), [1, 5], message('at'));
      deepEqual(_.at(array, args), [2, undefined, 4, undefined, 6], '_.at should work with `arguments` objects as secondary arguments');

      deepEqual(_.difference(args, [null]), [1, [3], 5], message('difference'));
      deepEqual(_.difference(array, args), [2, 3, 4, 6], '_.difference should work with `arguments` objects as secondary arguments');

      deepEqual(_.union(args, [null, 6]), [1, null, [3], 5, 6], message('union'));
      deepEqual(_.union(array, args), array.concat([null, [3]]), '_.union should work with `arguments` objects as secondary arguments');

      deepEqual(_.compact(args), [1, [3], 5], message('compact'));
      deepEqual(_.findIndex(args, _.identity), 0, message('findIndex'));
      deepEqual(_.findLastIndex(args, _.identity), 4, message('findLastIndex'));
      deepEqual(_.first(args), 1, message('first'));
      deepEqual(_.flatten(args), [1, null, 3, null, 5], message('flatten'));
      deepEqual(_.indexOf(args, 5), 4, message('indexOf'));
      deepEqual(_.initial(args, 4), [1], message('initial'));
      deepEqual(_.intersection(args, [1]), [1], message('intersection'));
      deepEqual(_.last(args), 5, message('last'));
      deepEqual(_.lastIndexOf(args, 1), 0, message('lastIndexOf'));
      deepEqual(_.rest(args, 4), [5], message('rest'));
      deepEqual(_.sortedIndex(args, 6), 5, message('sortedIndex'));
      deepEqual(_.uniq(args), [1, null, [3], 5], message('uniq'));
      deepEqual(_.without(args, null), [1, [3], 5], message('without'));
      deepEqual(_.zip(args, args), [[1, 1], [null, null], [[3], [3]], [null, null], [5, 5]], message('zip'));

      _.pull(args, null);
      deepEqual([args[0], args[1], args[2]], [1, [3], 5], message('pull'));

      _.remove(args, function(value) { return typeof value == 'number'; });
      ok(args.length == 1 && _.isEqual(args[0], [3]), message('remove'));
    });

    test('should accept falsey primary arguments', 3, function() {
      function message(methodName) {
        return '`_.' + methodName + '` should accept falsey primary arguments';
      }

      deepEqual(_.difference(null, array), [], message('difference'));
      deepEqual(_.intersection(null, array), [], message('intersection'));
      deepEqual(_.union(null, array), array, message('union'));
    });

    test('should accept falsey secondary arguments', 3, function() {
      function message(methodName) {
        return '`_.' + methodName + '` should accept falsey secondary arguments';
      }

      deepEqual(_.difference(array, null), array, message('difference'));
      deepEqual(_.intersection(array, null), [], message('intersection'));
      deepEqual(_.union(array, null), array, message('union'));
    });
  }(1, null, [3], null, 5));

  /*--------------------------------------------------------------------------*/

  QUnit.module('lodash methods');

  (function() {
    var allMethods = _.reject(_.functions(_), function(methodName) {
      return /^_/.test(methodName);
    });

    var returnArrays = [
      'at',
      'compact',
      'difference',
      'filter',
      'flatten',
      'functions',
      'initial',
      'intersection',
      'invoke',
      'keys',
      'map',
      'pairs',
      'pluck',
      'range',
      'reject',
      'rest',
      'shuffle',
      'sortBy',
      'times',
      'toArray',
      'union',
      'uniq',
      'values',
      'where',
      'without',
      'zip'
    ];

    var rejectFalsey = [
      'after',
      'bind',
      'compose',
      'curry',
      'debounce',
      'defer',
      'delay',
      'memoize',
      'once',
      'partial',
      'partialRight',
      'tap',
      'throttle',
      'wrap'
    ];

    var acceptFalsey = _.difference(allMethods, rejectFalsey);

    test('should accept falsey arguments', 148, function() {
      var isExported = '_' in root,
          oldDash = root._;


      _.forEach(acceptFalsey, function(methodName) {
        var actual = [],
            expected = _.map(falsey, function() { return []; }),
            func = _[methodName],
            pass = true;

        _.forEach(falsey, function(value, index) {
          try {
            actual.push(index ? func(value) : func());
          } catch(e) {
            pass = false;
          }
        });

        if (methodName == 'noConflict') {
          if (isExported) {
            root._ = oldDash;
          } else {
            delete root._;
          }
        }
        if (_.indexOf(returnArrays, methodName) > -1) {
          deepEqual(actual, expected, '_.' + methodName + ' returns an array');
        }
        ok(pass, '`_.' + methodName + '` accepts falsey arguments');
      });

      // skip tests for missing methods of modularized builds
      _.forEach(['noConflict', 'runInContext', 'tap'], function(methodName) {
        if (!_[methodName]) {
          skipTest();
        }
      });
    });

    test('should reject falsey arguments', 14, function() {
      _.forEach(rejectFalsey, function(methodName) {
        var actual = [],
            expected = _.map(falsey, function() { return true; }),
            func = _[methodName];

        _.forEach(falsey, function(value, index) {
          var pass = !index && methodName == 'compose';
          try {
            index ? func(value) : func();
          } catch(e) {
            pass = !pass;
          }
          actual.push(pass);
        });

        deepEqual(actual, expected, '`_.' + methodName + '` rejects falsey arguments');
      });
    });

    test('should handle `null` `thisArg` arguments', 30, function() {
      var thisArg,
          callback = function() { thisArg = this; },
          expected = (function() { return this; }).call(null);

      var funcs = [
        'countBy',
        'every',
        'filter',
        'find',
        'findIndex',
        'findKey',
        'findLast',
        'findLastIndex',
        'findLastKey',
        'forEach',
        'forEachRight',
        'forIn',
        'forInRight',
        'forOwn',
        'forOwnRight',
        'groupBy',
        'map',
        'max',
        'min',
        'omit',
        'pick',
        'reduce',
        'reduceRight',
        'reject',
        'remove',
        'some',
        'sortBy',
        'sortedIndex',
        'times',
        'uniq'
      ];

      _.forEach(funcs, function(methodName) {
        var array = ['a'],
            func = _[methodName],
            message = '`_.' + methodName + '` handles `null` `thisArg` arguments';

        thisArg = undefined;

        if (/^reduce/.test(methodName)) {
          func(array, callback, 0, null);
        } else if (methodName == 'sortedIndex') {
          func(array, 'a', callback, null);
        } else if (methodName == 'times') {
          func(1, callback, null);
        } else {
          func(array, callback, null);
        }

        if (expected === null) {
          strictEqual(thisArg, null, message);
        } else {
          equal(thisArg, expected, message);
        }
      });
    });

    test('should not contain minified method names (test production builds)', 1, function() {
      ok(_.every(_.functions(_), function(methodName) {
        return methodName.length > 2 || methodName == 'at';
      }));
    });
  }());

  /*--------------------------------------------------------------------------*/

  if (!document) {
    QUnit.config.noglobals = true;
    QUnit.start();
  }
}(typeof global == 'object' && global || this));
