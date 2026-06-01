CURRENT CODING PLATFORMS ARE DUMB AND BORING, I’LL BE CREATING A PLACE FOR CODERS TO HANGOUT DO SOME DSA, CREATING ROOM WITH A GOOGLE MEET LINK JUST ENJOYING TECH.

THIS IS GONNA BE CHILL CODING SESSION PLACE, MAYBE SOME LIGHT MUSIC AS WELL,

REAL WORLD USE CASE SHOWN, OVERALL A LOVING PLACE.

SUPPORTIVE SLANGS WHEN USER GETS SOMETHING WRONG.

I want to create a platform in which user can come and see a list of problems to solve just like leet code, and create a custom room and invite friends like a contest by friendly.

The differentiating factor will be that it’s very friendly and dope platform not like professional ones like leet code and hackerearth. we will have discord like vibe like it’s a game.

Elaborated Features list : 

1. Problem list : A list of problems which can be filtered on the basis of difficulty(**Beginner, Amateur, Semi-Pro, Professional, legendary.)**, type (array, strings, dp etc.).

2. Problem solving interface : when user clicks on the problem a wanted to solve a specific issue then we have this interface - here we will have : 
     a.  description section, examples with input and output,
     b. explanation for one of the examples. 
     c. constraints and required solution time and space complexity if required. 
     d. Code editor which will have a drop down to select language js and python for now. 
         an editor with shortcut to prettify the code inside the editor based on the language.
    e. run and submit button - run button will not store the entry of the user’s solution in db it just               executes the code and show passes and failed test cases, submit button will save the record           whether passed or failed. 
    d. after successful submission user must see how much time and space does it’s algo took. (no comparsion with other users).
    e. hints :  we can give hints to the user like use this do that i user wants to see the hints, we can give a button like show/hide hints.

3. Creating a room :  We will plan on this later but for now this is what im thinking - 

Name of the room

Default durations - 30min, 1hr.

Difficult level - **Beginner, Amateur, Semi-Pro, Professional, legendary.**

Link for coomon whitebord session - excalidraw, tldraw

room will generate a private link which can be shared with friends 

# Main issues to think about :

1. Sandboxing :  how we gonna execute code on the mahine like inside a docker container which will have python and node install take user’s code spits the output back to server.
2. Data formats  : in which strcture we gonna store things in db like for a single problem we have -
    1. Description
    2. examples
    3. hints
    4. constraints
    5. testcases (could be 10-100)
    6. driver code for each problem
    7. and other stuff 
3. connections bw FE and BE like websocket needed or not can be done by short polling etc.

# current actionables :

Let’s discuss a basic MVP for now where user can come no need for auth now, see list of problems at least 10 questions, can see fitlers, select a problem attempt the question run the code and see the response, upon submission record will be stored for the user that this user has completed this problems.

We need to discuss the Tech-stack best suitable for this all the things we can think of for now from FE and BE stacks to queses, db tables, redis etc.