var _ = require('lodash').mixin({
	isStream: require('isstream'),
});
var async = require('async-chainable');
var events = require('events');
var moment = require('moment');

var fields = [ // Only accept these fields (see the main Reflib project for details)
	'recNumber',
	'type',
	'title',
	'journal',
	'authors',
	'date',
	'year',
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
	'keywords',
	'accessDate',
	'accession',
	'doi',
	'section',
	'language',
	'researchNotes',
	'databaseProvider',
	'database',
	'workType',
	'custom1',
	'custom2',
	'custom3',
	'custom4',
	'custom5',
	'custom6',
	'custom7',
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

function _pusher(arr, isLast, rawChild, settings) {
	var child = _.pick(rawChild, fields); // Clip out anything we dont recognise
	child.type = (rawChild.type && refTypes.includes(rawChild.type)) ? child.type : settings.defaultType;
	settings.stream.write(JSON.stringify(child) + (!isLast ? ',' : ''));
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
		// Stream start {{{
		.then(function(next) {
			settings.stream.write('[');
			next();
		})
		// }}}
		// References {{{
		.then(function(next) {
			if (_.isFunction(settings.content)) { // Callback
				var batchNo = 0;
				var fetcher = function() {
					settings.content(function(err, data, isLast) {
						if (err) return emitter.error(err);
						if (_.isArray(data) && data.length > 0) { // Callback provided array
							data.forEach(function(d, dIndex) {
								_pusher(settings.stream, isLast && dIndex == data.length-1, d, settings);
							});
							setTimeout(fetcher);
						} else if(!_.isArray(data) && _.isObject(data)) { // Callback provided single ref
							_pusher(settings.stream, isLast, data, settings);
							setTimeout(fetcher);
						} else { // End of stream
							next();
						}
					}, batchNo++);
				};
				fetcher();
			} else if (_.isArray(settings.content)) { // Array of refs
				settings.content.forEach(function(d, dIndex) {
					_pusher(settings.stream, dIndex == settings.content.length -1, d, settings);
				});
				next();
			} else if (_.isObject(settings.content)) { // Single ref
				_pusher(settings.stream, true, data, settings);
				next();
			}
		})
		// }}}
		// Stream end {{{
		.then(function(next) {
			settings.stream.write(']');
			settings.stream.end();
			next();
		})
		// }}}
		// End {{{
		.end(function(err) {
			if (err) throw new Error(err);
		});
		// }}}

	return settings.stream;
}

module.exports = {
	output: output,
	parse: parse,
};
