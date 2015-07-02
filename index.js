var _ = require('lodash');
var async = require('async-chainable');
var events = require('events');
var moment = require('moment');

var types = {
	'recNumber': 'Number',
	'type': 'String',
	'title': 'String',
	'journal': 'String',
	'authors': 'Array/String',
	'date': 'Date',
	'urls': 'Array/String',
	'pages': 'String',
	'volume': 'String',
	'number': 'String',
	'isbn': 'String',
	'abstract': 'String',
	'label': 'String',
	'caption': 'String',
	'notes': 'String',
	'address': 'String',
	'researchNotes': 'String',
};

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

	setTimeout(function() {
		// Decode stream {{{
		var parseErr;
		try {
			var json = JSON.parse(raw.toString());
		} catch(err) {
			parseErr = err;
		}
		if (parseErr) return emitter.emit('error', 'Error parsing JSON: ' + parseErr);
		// }}}

		if (!_.isArray(json)) return emitter.emit('error', 'Input must be a JSON array');
		json.forEach(function(item) {
			emitter.emit('ref', item);
		});
		emitter.emit('end');
	});

	return emitter;
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
							refs.concat(data);
							setTimeout(fetcher);
						} else if(_.isObject(data)) { // Callback provided single ref
							refs.push(data);
							setTimeout(fetcher);
						} else { // End of stream
							next(refs);
						}
					}, batchNo++);
				};
				fetcher();
			} else if (_.isArray(settings.content)) { // Array of refs
				refs.concat(settings.content);
				next(refs);
			} else if (_.isObject(settings.content)) { // Single ref
				refs.push(settings.content);
				next(refs);
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
