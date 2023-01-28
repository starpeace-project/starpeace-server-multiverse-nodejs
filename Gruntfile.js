'use strict';

const { exec: createPackage } = require('pkg');

module.exports = function(grunt) {
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    clean: {
      build: ['bin/', 'dist/']
    },

    copy: {
      json: {
        files: [
          { expand: true, cwd: 'src', src: ['**/*.json', '!**/tsconfig.json'], dest: 'dist/app/' }
        ],
      }
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

  grunt.registerTask('package', ['create-executables']);
  grunt.registerTask('default', ['clean', 'copy:json']);

};
