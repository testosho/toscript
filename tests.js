function runTests() {
    console.log('Running tests...');

    // Test case for the bug: All-caps action line ending with a period
    function testAllCaLoudlypsActionLine() {
        console.log('Test: All-caps action line should be parsed as action, not character.');
        const script = "INT. ROOM - DAY\n\nTHE CLOCK TICKS LOUDLY.\n\nThen he stops.";
        const tokens = parseFountain(script);
        // The line "THE CLOCK TICKS LOUDLY." should be the 3rd token (empty line is a token)
        // and its type should be 'action'.
        // With the bug, it will be 'character'.
        const actionToken = tokens[2];
        console.assert(actionToken.type === 'action', 'Assertion failed: All-caps action line was not parsed as "action". Actual type: ' + actionToken.type);
        if (actionToken.type === 'action') {
            console.log('Test passed!');
        } else {
            console.error('Test failed!');
        }
    }

    testAllCaLoudlypsActionLine();
}

// Run tests when the script is loaded, but after the main script has defined parseFountain
document.addEventListener('DOMContentLoaded', () => {
    if (typeof parseFountain === 'function') {
        runTests();
    } else {
        console.error('parseFountain function not found. Tests cannot run.');
    }
});
