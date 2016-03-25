var _ = require('lodash').mixin({
	isStream: require('isstream'),
});
var async = require('async-chainable');
var events = require('events');
var moment = require('moment');

var types = [ // Only accept these fields (see the main Reflib project for details)
	'recNumber',
	'type',
	'title',
	'journal',
	'authors',
	'date',
	'urls',
	'pages',
	'volume',
	'number',
	'isbn',
	'abstract',
	'label',
	'caption',
	'notes',
	'address',
	'researchNotes',
	'tags',
];

var refTypes = [
	'aggregatedDatabase',
	'ancientText',
	'artwork',
	'audiovisualMaterial',
	'bill',
	'blog',
	'book',
	'bookSection',
	'case',
	'catalog',
	'chartOrTable',
	'classicalWork',
	'computerProgram',
	'conferencePaper',
	'conferenceProceedings',
	'dataset',
	'dictionary',
	'editedBook',
	'electronicArticle',
	'electronicBookSection',
	'encyclopedia',
	'equation',
	'figure',
	'filmOrBroadcast',
	'generic',
	'governmentDocument',
	'grant',
	'hearing',
	'journalArticle',
	'legalRuleOrRegulation',
	'magazineArticle',
	'manuscript',
	'map',
	'music',
	'newspaperArticle',
	'onlineDatabase',
	'onlineMultimedia',
	'pamphlet',
	'patent',
	'personalCommunication',
	'report',
	'serial',
	'standard',
	'statute',
	'thesis',
	'unpublished',
	'web',
];

/**
* List of allowable date formats
*/
var validDates = ['MM-DD-YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

function parse(raw) {
	var emitter = new events.EventEmitter();

	var decoder = function(content) {
		var parseErr;
		try {
			var json = JSON.parse(content);
		} catch(err) {
			parseErr = err;
		}

		if (parseErr) return emitter.emit('error', 'Error parsing JSON: ' + parseErr);

		if (!_.isArray(json)) return emitter.emit('error', 'Input must be a JSON array');
		json.forEach(function(item) {
			emitter.emit('ref', item);
		});
		emitter.emit('end');
	};


	setTimeout(function() { // Add to next cycle so we can correctly return an emitter
		if (_.isString(raw) || _.isBuffer(raw)) {
			decoder(raw.toString());
		} else if (_.isStream(raw)) {
			var rawContent = '';
			raw
				.on('data', function(data) {
					rawContent += data;
				})
				.on('end', function() {
					decoder(rawContent);
				});
		} else {
			emitter.emit('error', 'Unknown input type');
		}
	});

	return emitter;
};

function _pusher(arr, rawChild, settings) {
	var child = _.pick(rawChild, types); // Clip out anything we dont recognise
	child.type = (rawChild.type && _.includes(types, rawChild.type)) ? child.type : settings.defaultType;
	arr.push(child);
};

function output(options) {
	var settings = _.defaults(options, {
		stream: null,
		defaultType: 'report', // Assume this reference type if we are not provided with one
		content: [],
	});
	async()
		// Sanity checks {{{
		.then(function(next) {
			if (!settings.content) return next('No content has been provided');
			next();
		})
		// }}}

		// References {{{
		.then('refs', function(next) {
			var refs = [];

			if (_.isFunction(settings.content)) { // Callback
				var batchNo = 0;
				var fetcher = function() {
					settings.content(function(err, data) {
						if (err) return emitter.error(err);
						if (_.isArray(data)) { // Callback provided array
							data.forEach(function(d) { _pusher(refs, d, settings) });
							setTimeout(fetcher);
						} else if(_.isObject(data)) { // Callback provided single ref
							_pusher(refs, data, settings);
							setTimeout(fetcher);
						} else { // End of stream
							next(null, refs);
						}
					}, batchNo++);
				};
				fetcher();
			} else if (_.isArray(settings.content)) { // Array of refs
				settings.content.forEach(function(d) { _pusher(refs, d, settings) });
				next(null, refs);
			} else if (_.isObject(settings.content)) { // Single ref
				_pusher(refs, data, settings);
				next(null, refs);
			}
		})
		// }}}

		.end(function(err) {
			settings.stream.write(JSON.stringify(this.refs));
			settings.stream.end();
			if (err) throw new Error(err);
		});

	return settings.stream;
}

module.exports = {
	output: output,
	parse: parse,
};
