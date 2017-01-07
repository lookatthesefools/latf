'use strict';

const snoowrap = require('snoowrap');
const r = new snoowrap({
	userAgent: 'node.js on heroku for latf',
	clientId: process.env.CLIENTID,
	clientSecret: process.env.CLIENTSECRET,
	username: process.env.REDDITUSR,
	password: process.env.REDDITPW
})

var searchTerms = [
	'cuck',
	'feminazi',
	'libtard',
	'autist',
	'trigger',
	'lefties',
	'shitlib',
	'libtard',
	'centipede',
	'sjw',
	'spicy',
	'cunt'
]

// var i;
// var posts = [];
// var promises = [];

// for (i = 0; i < searchTerms.length; i++) {
// 	var prom = r.getSubreddit('the_donald')
// 		.search({query:searchTerms[i]})
// 		.then( (p) => {
// 			posts = posts.concat(p);
// 		})
// 	promises.push(prom);
// };

// Promise.all(promises).then((a) => {
// 	runServer(posts);
// });

runServer();

function runServer() {

	console.log('==============starting runServer==============')

	var posts = [];
	
	refreshPosts(posts)
	.then( (p) => {
		posts = p;
		console.log('fetched', posts.length, 'initial posts!');
	});

	setInterval( () => {
		refreshPosts(posts)
			.then( (p) => {
				posts = p;
				console.log('fetched', posts.length, 'new posts!');
			});
		}
	, 1800000);

	const express = require('express');
	const bodyParser = require('body-parser')
	const app = express();
	const MongoClient = require('mongodb').MongoClient
	
	app.use(bodyParser.urlencoded({extended: true}));

	var db;
	var loginString = 'mongodb://' + process.env.DBUSERNAME + ':' + process.env.DBPASSWORD + '@ds155418.mlab.com:55418/latf-hof';
	
	MongoClient.connect(loginString	, (err, database) => {
		if (err) return console.log(err);
		db = database;

		app.use(express.static('public'))
		app.set('view engine', 'ejs');
		app.set('port', (process.env.PORT || 3000));
		app.listen(app.get('port'), () => {
			console.log('listening on', app.get('port'));
		});
	});

	console.log('==============DB logged in==============')

	app.get('/', (req, res) => {
		var p = shuffle(posts);
		res.render('pages/latf.ejs', {posts: p.slice(0,10)})
	});

	app.get('/halloffame', (req, res) => {
		db.collection('posts').find().sort({time: -1}).toArray((err, result) => {
			if (err) return console.log(err);
			res.render('pages/hof.ejs', {posts: result});
		});
	});

	app.post('/hof', (req, res) => {
		var submissions = [];
		var postProms = [];
		var empty = true;
		var i;

		if (typeof(req.body.redditPost) === 'string') {
			var postProm = r.getSubmission(req.body.redditPost)
				.fetch()
				.catch(() => console.log('failed!'))
				.then( x => {submissions.push(x)} )
			postProms.push(postProm);
			empty = false;
		} else if (typeof(req.body.redditPost) === 'object') {
			for (i=0;i<req.body.redditPost.length;i++) {
				// console.log(typeof(req.body.redditPost[i]));
				var postProm = r.getSubmission(req.body.redditPost[i])
					.fetch()
					.catch(() => console.log('failed!'))
					.then( x => {submissions.push(x)} )
				postProms.push(postProm);
			}
			empty = false;
		} else {
			res.redirect('/')
		}

		if (empty === false) {
			Promise.all(postProms).then( () => {
				for (i=0;i<submissions.length;i++) {
					var sp = sanitizePost(submissions[i]);
					console.log(sp);
					db.collection('posts').save(sp, (err, result) => {
						if (err) return console.log(err);
						console.log('saved to database');
					});
				}
				res.redirect('/halloffame');
			});
		};
	});
}

// Helper functions

function refreshPosts(posts) {
	var bigProm = new Promise( (resolve, reject) => {
		var i = [];
		posts = [];
		var newPromises = [];
		for (i = 0; i < searchTerms.length; i++) {
			var newProm = r.getSubreddit('the_donald')
				.search({query:searchTerms[i]})
				.then( (p) => {
					posts = posts.concat(p);
				});
			newPromises.push(newProm);
		};
		Promise.all(newPromises).then(() => {
			resolve(posts);
		});
	});
	return bigProm;
}

function sanitizePost(blob) {
	var newObject = {
		id: blob.id,
		title: blob.title,
		author: blob.author.name,
		thumbnail: blob.thumbnail,
		url: blob.url,
		commentsUrl: 'https://reddit.com/r/' + blob.subreddit.display_name + '/comments/' + blob.id,
		time: Date.now()
	}
	return newObject;
}

function showTitles(l) {
	var i;
	var titles = [];
	for (i=0;i<l.length;i++) {
		var tid = l[i].id;
		var tit = l[i].title.slice(0,60);
		titles = titles.concat( { tid: tit } )
	};
	return titles;
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}
