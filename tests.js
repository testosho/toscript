function runNewTests() {
    console.log('Running new comprehensive tests for Fountain.js implementation...');

    function testCorrectParsing() {
        console.log('Test: Script with various elements should be parsed correctly.');
        const script = "INT. ROOM - DAY\n\nCHARACTER\nDialogue.\n\nAN ACTION LINE IN CAPS.\n\nAnother action.";

        const output = parseFountain(script);

        if (!output || !output.tokens) {
            console.error('Test failed: No output from parser.');
            return;
        }

        const sceneHeading = output.tokens.find(t => t.type === 'scene_heading');
        const character = output.tokens.find(t => t.type === 'character');
        const dialogue = output.tokens.find(t => t.type === 'dialogue');
        const action1 = output.tokens.find(t => t.text === 'AN ACTION LINE IN CAPS.');
        const action2 = output.tokens.find(t => t.text === 'Another action.');

        let allTestsPassed = true;

        // Test 1: Scene heading
        console.assert(sceneHeading, 'Assertion failed: Scene heading not found.');
        if (!sceneHeading) allTestsPassed = false;

        // Test 2: Character
        console.assert(character && character.text === 'CHARACTER', 'Assertion failed: Character not parsed correctly.');
        if (!character || character.text !== 'CHARACTER') allTestsPassed = false;

        // Test 3: Dialogue
        console.assert(dialogue && dialogue.text === 'Dialogue.', 'Assertion failed: Dialogue not parsed correctly.');
        if (!dialogue || dialogue.text !== 'Dialogue.') allTestsPassed = false;

        // Test 4: All-caps action line (the original bug)
        console.assert(action1 && action1.type === 'action', 'Assertion failed: All-caps action line was not parsed as "action". Actual type: ' + (action1 ? action1.type : 'not found'));
        if (!action1 || action1.type !== 'action') allTestsPassed = false;

        // Test 5: Regular action line
        console.assert(action2 && action2.type === 'action', 'Assertion failed: Regular action line not parsed correctly.');
        if (!action2 || action2.type !== 'action') allTestsPassed = false;

        if (allTestsPassed) {
            console.log('%cAll parsing tests passed!', 'color: green; font-weight: bold;');
        } else {
            console.error('One or more parsing tests failed.');
        }
    }

    testCorrectParsing();
}

// Run tests when the script is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Need to wait for fountain.js to be ready
    setTimeout(() => {
        if (typeof fountain !== 'undefined' && typeof parseFountain === 'function') {
            runNewTests();
        } else {
            console.error('Fountain.js or parseFountain function not found. Tests cannot run.');
        }
    }, 500); // Wait a bit for external scripts
});
