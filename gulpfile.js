const path = require('path')
const fs = require('fs')
const { spawn } = require('child-process-promise')

const gulp = require('gulp')
const sass = require('gulp-sass')
const postcss = require('gulp-postcss')
const plumber = require('gulp-plumber')
const rev = require('gulp-rev')
const replace = require('gulp-replace')
const htmlmin = require('gulp-htmlmin')
const inlinesource = require('gulp-inline-source')

const globby = require('globby')
const moduleImporter = require('sass-module-importer')
const del = require('del')
const autoprefixer = require('autoprefixer')
const cssNano = require('cssnano')
const escape = require('escape-string-regexp')

async function execCommand (args) {
  // iterate over every package and execute the command described above
  const cmd = args[0]
  args.shift()
  const dirs = await globby('packages/browser-*', {
    onlyDirectories: true
  })

  const promises = dirs
    .filter((dir) => {
      // Filter dir if its package.json file has skip: true
      const pkg = require(path.join(__dirname, dir, 'package.json'))
      if (pkg.skip) {
        console.log(`skipping package ${path.join(__dirname, dir)}`)
      }
      return !pkg.skip
    })
    .map(dir => spawn(cmd, args, {
      cwd: path.join(process.cwd(), dir),
      stdio: 'inherit',
      env: { ...process.env }
    }))
  await Promise.all(promises)
}

gulp.task('clean', function () {
  return del(['public'])
})

gulp.task('css', function () {
  const processors = [
    autoprefixer,
    cssNano
  ]
  return gulp.src('./sass/*.scss')
    .pipe(sass({ importer: moduleImporter() }).on('error', sass.logError))
    .pipe(postcss(processors))
    .pipe(gulp.dest('./static/css'))
})

gulp.task('build:packages', async () => {
  await spawn('./node_modules/.bin/lerna', ['bootstrap', '--hoist'], { stdio: 'inherit' })
  await execCommand(['npm', 'install'])
  await execCommand(['npm', 'run', 'build'])
})

gulp.task('build:hugo', () => {
  return spawn('hugo', { stdio: 'inherit' })
})

gulp.task('build:html-minify', () => {
  return gulp.src('public/**/*.html')
    .pipe(inlinesource({
      compress: true,
      rootpath: path.resolve(path.join(__dirname, 'public/'))
    }))
    .pipe(htmlmin({
      collapseWhitespace: true,
      conservativeCollapse: true,
      collapseBooleanAttributes: true,
      decodeEntities: true,
      processConditionalComments: true,
      removeAttributeQuotes: true,
      removeComments: true,
      // removeEmptyAttributes: true,
      // removeOptionalTags: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      removeTagWhitespace: true,
      trimCustomFragments: true,
      sortAttributes: true,
      sortClassName: true,
      useShortDoctype: true,

      // collapseInlineTagWhitespace: true,
      // fragments like \[ anything \]
      ignoreCustomFragments: [
        // hugo things
        /<%[\s\S]*?%>/, /<\?[\s\S]*?\?>/,
        // block latex
        /\$\$[\s\S]*?\$\$/
      ],
      minifyJS: true,
      minifyCSS: true
    }))
    .pipe(gulp.dest('public'))
})

gulp.task('build:sitemap', () => {
  const env = Object.create(process.env)
  return spawn('babel-node', ['scripts/flatten-render-tree.js'], {
    stdio: 'inherit',
    env
  })
})

gulp.task('watch', gulp.series('build:sitemap', (done) => {
  gulp.watch('./sass/**', gulp.series('css'))
  done()
}))

gulp.task('revision:rev', () => {
  return gulp.src(['public/**/*.{js,css}'])
    .pipe(gulp.dest('public/'))
    .pipe(rev())
    .pipe(gulp.dest('public/'))
    .pipe(rev.manifest())
    .pipe(gulp.dest('public/'))
})

gulp.task('revision:rev-replace', () => {
  const manifestFile = fs.readFileSync(path.join(__dirname, 'public/rev-manifest.json'), { encoding: 'utf-8' })
  const manifest = JSON.parse(manifestFile)
  const cat = Object.keys(manifest)
    .reduce((old, key) => `${old}|(${escape(key)})`, '@@@@@')
  const re = new RegExp(cat, 'g')
  return gulp.src('public/**/*.html')
    .pipe(replace(re, match => manifest[match]))
    .pipe(gulp.dest('public'))
})

gulp.task('revision', gulp.series('revision:rev', 'revision:rev-replace'))

gulp.task('build', gulp.series(
  'clean',
  'css',
  'build:sitemap',
  'build:packages',
  'build:hugo',
  'build:html-minify',
  'revision'
))

gulp.task('default', gulp.series('css', 'watch'))
