## Development

There are two ways to run the code:

1. Build the code and then open the web page

- Run `npm install`
- Run `npm run build`
- Open the html file dist/index.html (NOT src/index.html)

2. Use the development server

- Run `npm install`
- Run `npm run dev`, this will automatically open a web page at localhost:4000
- Open localhost:4000 in your browser if it didn't already

The development server will have some additional features that help with the
development process, but are not essential.

## Summary on how the game works
    Objects such as the logs, goals and frogger are represented using simple geometric shape. 
The main character, frogger, is controllable by user using the arrow keys. These objects are bounded 
to the type “State” to kept track of their status. The game experiences passage of time via having an 
observable that create a tick event for every interval of time. Meanwhile, another observable is used 
to create a move event every time it captures the user’s “keydown” action. These two observables 
are merged according to the order in which they entered the stream. Depending on the type events 
first arrived into the stream, actions such as manipulating the states of frog, obstacles, logs are being 
perform by respective functions while maintaining the pureness of the code as much as possible.
To ensure the code as pure as possible, functions such as filter (), map () and scan () are used 
as often to generate a new state object as output when manipulation of the state is required.
Several additional properties such “score” and “gameOver” to ease the tracking of game progress 
while maintaining as much pureness in the functions. As the view must be updated over time, the
only impure function named “updateView” is created to update the views of all objects and perform 
impure actions such as showing the “GameOver” message and set the attribute of the objects 
according to the update state. 
    The collision handling between frogger and other objects is the most complicated one as the 
frogger will behave in different ways when it collided with different objects. For instance, the 
“gameOver” flag will be raise if frogger’s eithers is in intersection with a car or when it does not 
intersect with the plank on the river. Else if the frogger collide with the “goal” objects, the player will 
earn a decent amount of score, transport frogger to initial position, and increase the speed of 
certain objects. All this action is pure because the respective function will not manipulate the input 
state but return a new state object with certain modification.
Lastly, there are two enemies that will causes disturbance to the player for the frogger to 
move to its goals normally. For example, the squid will block the player’s view by adding a black 
rectangle on top of the view of other objects. The “blindness” is not forever and will be removed 
after a certain of time via using observables to remove it from the canvas.

## The usage of Observables
Observables are being used to create of a stream of “Move” object every time it captures an
asynchronous behavior, in this case the user’s keyboard event. Some of these processes such as 
having a “Move” and “Tick” class are references to the “FRP Asteroid” by Tim Dwyer. These
observables not only help to create “Move” and “Tick” objects, it can merge these events together
to allow the program to know which events has arrived the stream first and perform respective 
actions on them. Apart from that observables are used mainly in the updateView () function that is 
passed into the subscribe. It provides the flexibility such as the duration of showing the game 
messages, and removing the “blindness” cause by the “squid” after certain time. The waiting time to 
execute the functionality will not interrupting the other subscribe due the fact that subscription are 
run in parallel. 