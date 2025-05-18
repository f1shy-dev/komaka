// Main function demonstrating various Rust features
fn main() {
    let mut x = 5;
    println!("Initial value of x: {}", x);

    x = calculate_new_value(x, 10);
    println!("Updated value of x: {}", x);

    // Using a struct
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        rect1.area()
    );

    // Pattern matching
    match x {
        0 => println!("x is zero"),
        1..=10 => println!("x is between 1 and 10"),
        _ if x % 2 == 0 => println!("x is an even number greater than 10"),
        _ => println!("x is an odd number greater than 10"),
    }

    // Loop and vector
    let mut numbers = vec![1, 2, 3, 4, 5];
    process_numbers(&mut numbers);
    println!("Processed numbers: {:?}", numbers);

    // Call a generic function
    let p1 = Point { x: 5, y: 10.4 };
    let p2 = Point { x: "Hello", y: 'c' };
    
    println!("p1: {{ x: {}, y: {} }}", p1.x, p1.y);
    println!("p2: {{ x: {}, y: {} }}", p2.x, p2.y);

    // A simple closure
    let add_one = |num: i32| num + 1;
    println!("7 + 1 = {}", add_one(7));

    /*
     * This is a multi-line comment block.
     * It's here to provide a larger segment for block replacement tests.
     * We can target this block specifically.
     * Line 3 of comment block.
     * Line 4 of comment block.
     */

    helper_function_for_main();
}

// A helper function
fn calculate_new_value(val: i32, add: i32) -> i32 {
    // This is a comment inside calculate_new_value
    val + add // Return statement
}

// Definition of a struct
struct Rectangle {
    width: u32,
    height: u32,
}

// Implementation block for the struct
impl Rectangle {
    fn area(&self) -> u32 {
        // Calculate area
        self.width * self.height // Comment for area
    }
}

// Another function that processes a vector
fn process_numbers(nums: &mut Vec<i32>) {
    // This is a line to be targeted for replacement
    for i in 0..nums.len() {
        nums[i] *= 2; // Double each number
    }
    // End of process_numbers function
}

// A generic struct
struct Point<T, U> {
    x: T,
    y: U,
}

// Another helper function
fn helper_function_for_main() {
    println!("This is a helper function for main.");
    // Let's add some more lines here for testing line ranges
    // Line A
    // Line B
    // Line C
    // Line D
    // Line E
    println!("Helper function finished.");
}

// Final line of the file 