'use strict';

const { exec: createPackage } = require('pkg');
const fs = require('fs');
const _ = require('lodash');

module.exports = function(grunt) {
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    clean: {
      build: ['bin/', 'dist/']
    },

    coffee: {
      compile: {
        expand: true,
        cwd: "src",
        src: ['**/*.coffee'],
        dest: 'dist',
        ext: '.js'
      }
    },

    copy: {
      javascript: {
        files: [
          {expand: true, cwd: 'src', src: ['**/*.js'], dest: 'dist/'}
        ],
      },
    }
  });

  grunt.registerTask('create-executables', function() {
    var done = this.async();

    var targets = [];
    ['win'].forEach((os) => {
      ['x86', 'x64'].forEach((arch) => {
        targets.push(`latest-${os}-${arch}`);
      });
    });

    createPackage(['package.json' , '--target', targets.join(','), '--output', 'bin/server' ])
      .then(function() {
        createPackage(['setup.config.json' , '--target', targets.join(','), '--output', 'bin/setup' ])
          .then(done);
      });
  });

  grunt.registerTask('build', ['coffee:compile', 'copy:javascript']);
  grunt.registerTask('package', ['clean', 'build', 'create-executables']);
  grunt.registerTask('default', ['clean', 'build']);

}
