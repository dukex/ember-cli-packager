'use strict';

var mergeTrees = require('broccoli-merge-trees');
var concat = require('broccoli-sourcemap-concat');
var funnel = require('broccoli-funnel');
var globsFor = require('../utils/globs-for');
var stew = require('broccoli-stew');
var rm = stew.rm;
var find = stew.find;
var rename = stew.rename;

function flatten(arr) {
  return [].concat.apply([], arr);
}

function createGlobs(entry, exts) {
  return exts.map(function(ext) {
    return entry + '/**/*.' + ext;
  });
}

function concatEntries(tree, main, entries, exts, outputPaths) {
  var globs = {};

  entries.forEach(function(entry) {
    globs[entry] = createGlobs(entry, exts);
  });

  return flatten(entries.map(function(entry) {
    return flatten(globs[entry].map(function(glob, i) {
      var ext = exts[i];
      var trees = [];
      glob = [glob];

      if (entry === main && ext === 'js') {
        globsFor('main', glob);
        globsFor('test', glob);

        tree = rename(tree, function(relativePath) {
          if (relativePath === main + '/test-index.js') {
            return main + '-tests/index.js';
          }
          return relativePath;
        });

        trees.push(find(tree, '**/{testem.js}'));
        tree = rm(tree, '**/testem.js');
      }

      var outputPath = outputPaths['app'][ext];

      if (ext === 'css') {
        outputPath = outputPath['app'];
      }

      trees.push(concat(tree, {
        outputFile: outputPath,
        inputFiles: glob
      }));

      return trees;
    }));
  }));
}

function concatVendor(tree, entries, exts, outputPaths) {
  var exclusionGlobs = entries.map(function(entry) {
    return entry + '/*';
  });

  var vendorTrees = funnel(tree, {
    exclude: exclusionGlobs
  });

  return exts.map(function(ext) {
    var glob = ['**/*.' + ext];

    if (ext === 'js') {
      globsFor('vendor', glob);
    }

    return concat(vendorTrees, {
      outputFile: outputPaths['vendor'][ext],
      inputFiles: glob
    });
  });
}

module.exports = function(tree, main, entries, outputPaths) {
  var exts = ['js', 'css', 'html'];
  var entryTrees = concatEntries(tree, main, entries, exts, outputPaths);
  var vendorTrees = concatVendor(tree, entries, ['js', 'css'], outputPaths);

  return mergeTrees(entryTrees.concat(vendorTrees));
};
