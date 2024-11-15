// Function to count classes or entities in the UML text
export function countClasses(umlText) {
    const classRegex = /\b(class|entity)\s+\w+/g;
    const matches = umlText.match(classRegex);
    return matches ? matches.length : 0;
}
