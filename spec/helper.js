global.window = {};
var customMatchers = {
    //a matcher that asserts a given string is thrown as the error
    toThrowWithMessage: function(util, customEqualityTesters) {
        return {
            compare: function(actual, expected) {
                if(expected === undefined) {
                    expected = '';
                }

                var result = {};
                try {
                    actual();
                } catch (e) {
                    var exMessage = (e.message);
                    result.pass = exMessage === expected;
                }
                if(result.pass) {
                    result.message = 'passed';
                } else {
                    result.message = 'Expected `' + exMessage + '` to equal `' + expected + '`';
                }
                return result;
            }
        }
    }
};

//globally apply custom matchers before every test
beforeEach(function() {
    jasmine.addMatchers(customMatchers);
});

function RecordType(id, property) {
    if(typeof id === 'number') id = id.toString();
    else if(!id) id = (RecordType.id++).toString();
    this.property = property || Math.random();
    this.id = id;
}

RecordType.id = 0;

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex ;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

module.exports = {
    shuffle: shuffle,
    DataSourceRecordType: RecordType
};
