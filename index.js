var _ = {
	get: require('lodash/get'),
	pick: require('lodash/pick'),
};
var async = require('async-chainable');
var events = require('events');
var stream = require('stream');

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

function parse(raw, options) {
	var settings = {
		path: '', // Nested dotted notation / array path to read from
		...options,
	};

	var emitter = new events.EventEmitter();

	var decoder = function(content) {
		var parseErr;
		try {
			var json = JSON.parse(content);
			if (settings.path) json = _.get(json, settings.path);
		} catch(err) {
			parseErr = err;
		}

		if (parseErr) return emitter.emit('error', 'Error parsing JSON: ' + parseErr);

		if (!Array.isArray(json)) return emitter.emit('error', 'Input must be a JSON array');
		json.forEach(function(item) {
			emitter.emit('ref', item);
		});
		emitter.emit('end');
	};


	setTimeout(function() { // Add to next cycle so we can correctly return an emitter
		if (typeof raw == 'string' || Buffer.isBuffer(raw)) {
			decoder(raw.toString());
		} else if (raw instanceof stream.Stream) {
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
	var child = settings.fields === true ? rawChild : _.pick(rawChild, settings.fields); // Clip out anything we dont recognise
	if (settings.fieldType) child.type = (rawChild.type && refTypes.includes(rawChild.type)) ? child.type : settings.defaultType;
	settings.stream.write(JSON.stringify(child) + (!isLast ? ',' : ''));
};

function output(options) {
	var settings = {
		stream: null,
		path: '', // Nested dotted notation / array path to write references into
		defaultType: 'report', // Assume this reference type if we are not provided with one
		content: [],
		fields: fields, // Default to filtering by known fields, if falsy everything is exported even if its unknown
		...options,
	};

	settings.fieldType = settings.fields === true ? true : settings.fields.includes('type'); // Quick reference boolean as to whether to include the calculated 'type' field

	async()
		// Sanity checks {{{
		.then(function(next) {
			if (!settings.content) return next('No content has been provided');
			next();
		})
		// }}}
		// Stream start {{{
		.then(function(next) {
			if (settings.path) { // Output with path prefix
				settings.stream.write('{"' + settings.path + '":[');
			} else { // No path prefix
				settings.stream.write('[');
			}
			next();
		})
		// }}}
		// References {{{
		.then(function(next) {
			if (typeof settings.content == 'function') { // Callback
				var batchNo = 0;
				var fetcher = function() {
					settings.content(function(err, data, isLast) {
						if (err) return emitter.error(err);
						if (Array.isArray(data) && data.length > 0) { // Callback provided array
							data.forEach(function(d, dIndex) {
								_pusher(settings.stream, isLast && dIndex == data.length-1, d, settings);
							});
							setTimeout(fetcher);
						} else if(!Array.isArray(data) && typeof data == 'object') { // Callback provided single ref
							_pusher(settings.stream, isLast, data, settings);
							setTimeout(fetcher);
						} else { // End of stream
							next();
						}
					}, batchNo++);
				};
				fetcher();
			} else if (Array.isArray(settings.content)) { // Array of refs
				settings.content.forEach(function(d, dIndex) {
					_pusher(settings.stream, dIndex == settings.content.length -1, d, settings);
				});
				next();
			} else if (Array.isObject(settings.content)) { // Single ref
				_pusher(settings.stream, true, data, settings);
				next();
			}
		})
		// }}}
		// Stream end {{{
		.then(function(next) {
			if (settings.path) {
				settings.stream.write(']}');
			} else { // No path prefix
				settings.stream.write(']');
			}
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
