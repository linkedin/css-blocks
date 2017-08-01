module.exports = function(grunt) {
  grunt.initConfig({
    release: {
      options: {
        npm: false,
        afterRelease: ['run:publish']
      }
    },
    run: {
      publish: {
        cmd: 'li-npm-publish'
      }
    }
  });
  grunt.loadNpmTasks('grunt-release');

  grunt.registerTask('default', []);
};
