---
title: I rebuilt Night City with AI agents, zero Blender experience and 7 billion tokens
date: 2026-10-24
summary: Cyberpunk's Night City runs on this site, and you can drive it. AI agents built it. I built the setup they worked in, changed it every time they got stuck, and overruled their reviewer on my own car.
---

<figure>
<video controls playsinline preload="metadata" width="1920" height="1080" poster="/blog/night-city-final/poster.jpg" src="/blog/night-city-final/reel.mp4" aria-label="Launch reel: a flight through the 3D Night City on this site"></video>
<figcaption>All of it is live. Scroll through the city in <a href="/playground">the playground</a> or fly into <a href="/playground#garage">the garage</a>. On a desktop, open <a href="/braindance">the braindance</a>, press G to drive the loop and F to get out and walk.</figcaption>
</figure>

Night City, the city from Cyberpunk 2077, runs on my website. You can cruise around in a car, opt for a leisurely stroll, and even fly into a garage where two 1:1 models of my cars are parked. 

Claude and Codex built every piece of the city, working as AI agents: models that can edit files, run programs, assess their work, and continue for hours. I never opened Blender, and barely read or looked at the code. The entire point of this exercise was to let the agents do the work, to see how far they could go on something I couldn't do myself. What I built was the setup they worked in. Every time they got stuck I unblocked them, the same way a Software Engineering Mentor would unblock his intern. I gave them the right tools, wrote the rules, and stepped in when they got stuck or started cheating on their own checks. Once, my Sol reviewers went into a hell loop, burning tokens and never agreeing on a final unanimous decision, so I stepped in.

The biggest changes came from catching a reviewer answering the wrong question, like scoring the city out of 10 when it should have been listing what was broken. The last time, on my own car, the wrong question was instead my own.

Why was I building a city at all? It traces back to a horrible computer with purple fans that 12-year-old me bought to run Ark and Minecraft servers on.

## Purple fans

I bought it off a random Amazon listing that said "gaming computer," but the main selling point was these cool purple fans that lit up. I didn't know, or quite frankly care, what a GPU was. The most I did on a computer back then was play and script Roblox games, and embarrassingly host Ark and Minecraft game servers for my friends and me. The big games I really loved, like GTA 5, lived on my PS4. Because I wasn't running huge games on my computer, its graphics were built into the processor rather than an actual graphics card. It could barely run Fortnite at 30 frames a second on low. The first upgrade I gave it was more RAM, one of the more critical resources for game servers.

During COVID, when I was 14, the GPU shortage hit. GPUs, RAMs, graphics cards: nobody could get any components. I really wanted a dedicated graphics card, which was unrealistic for an additional reason. I was young and broke. So, I spent hours detailing the function and importance of a graphics card to my grandma. Eventually, she lent me around $500, exactly enough for an RX 6700 XT. With this substantial amount of money in hand, the next challenge was actually buying the graphics card.

Buying a card at launch was every man for himself, the modern day Hunger Games. My whole family always called me "lazy but smart" because I find the less traversed path around the long road everyone else took. To get the RX 6700 XT, the way around was a bot. Drawing inspiration from sneakerheads, I watched countless YouTube tutorials on Python sneaker bots and wrote my own, built for one job: buying a single GPU on launch day. It worked.

The bot got me my card, then PS5s for my whole friendgroup, then a 3060 Ti for my younger brother. This was early in the scalping era, and my bot was never used to scalp, which I think is a horribly unfair practice. Rather, I was young and frustrated that I couldn't buy a card at the maker's set price. I had an impossible problem I wanted to solve, and I tackled the challenge in the only way I knew: I wrote code to automate my way around the bottleneck. 

Most people couldn't buy a GPU or a PS5 back then. I ran on the edge and got them anyway. Like the mercenaries in my favorite show, "Cyberpunk," I operated on the knife's edge. I've always loved that thrill. 

What I loved so much about the game, and eventually inspired me to recreate Night City, was how insanely alive it was: people arguing, cars driving, so much going on at once, despite how horrible life was for most of its citizens. Seeing it for the first time, I felt the same way reading 1984 in tenth grade English. I was just in awe that a world like that could exist on the page, and it was a bit scary.

Building my own Night City was a test of what the models could do, and what I could get them to do. Anyone could build this, and that's what I find so amazing about our reality. While AI has its problems, it enables me to really do the impossible. We live in a world now where the sky is no longer the limit. Instead, it's your own imagination and aspirations. 

A Night City of my own sounded just as out of reach as a GPU during the shortage. Then I saw someone pull off a different "impossible" build with AI agents.

## I'm not the expert here

Jarred Sumner had just [ported Bun](https://github.com/oven-sh/bun/pull/30412), the JavaScript runtime he created, from Zig to Rust with Claude. A port that size was never feasible, and I observed how he set the agents up with real tools and room to run. I watched [Theo](https://t3.gg) a significant amount too, and I still use his phrase for that room: let the agent boil the ocean. Instead of micromanaging every small step, you hand the agent a huge goal and let it grind through the problem on its own.

I always wanted to build 3D things but never picked it up. I'm a systems and backend engineer. This summer I interned at Amazon Web Services on [CloudFormation](/work/aws-cloudformation), and at Philips I [automated Windows setup](/work/philips-zero-touch) for about a thousand industrial PCs. None of that is 3D. I know my frontend stack, but three.js, the code library that draws 3D inside a web page, was completely uncharted for me. 

I'm not the expert here, but the models can be. So I treated them the way I was mentored at AWS. My mentor never sat and wrote my code with me. He grilled me in code reviews and asked what tools I needed and what was blocking me. So, I asked my agents the same thing, and the answer was Blender, a free 3D program commonly used for films and games. The agents couldn't see inside the software so I gave them Blender MCP, a bridge so agents can run code inside a live Blender session, render what it built, view the render, and keep going. Finally, I gave the agents a unique skill I developed, "fleet page," which allows agents to page me when absolutely necessary. Managing an internship, difficult coursework, and other personal responsibilities, I don't have time to babysit the agents. However, the last thing I want is agents hitting a blocker and finding a workaround that leads to bad outcomes. Fleet page was one of the many ways agents contacted me to coordinate and address their blockers. 

Its first build was my own car, a supercharged 2013 Audi S4 I tuned. I asked for a one-of-one replica, setting the bar high and providing my agent with only an old render of the car and my photos. It rebuilt the car down to a hood that opens on its gas strut. Now, the rear plate reads CHOOM, Night City slang for friend, which I requested because I didn't really want my license plate leaked... 

## A painted wall

I wanted the city to be real, so the bar I gave them was unrealistic: rebuild Cyberpunk's Night City, what Theo would call a 'Hill Climb': set a high bar and let the agents climb a massive hill to get the reward at the end. The first attempt was one agent working from a long spec we wrote together through a Q&A, with my rules on top, never merging into the live site. At first, the city was not meant to be drivable. The original plan was a camera cinematic. It was built for about eight fixed camera shots. Anything a shot didn't look at was, as a later brief put it, "a painted wall, an instanced box or nothing," the box being one shape stamped out over and over. Turn left at the main junction and the street ended in black ground under colored boxes.

The agents often cut corners. The first street cars were two stacked boxes. The train was one box with cars painted on it. Of the 395 people standing around Corpo Row, the corporate district, 251 were 15 centimeters under the pavement. Each pass had graded its own work: the same agent that took the shortcut also looked at the result and signed off on it.

My first fix was a polish pass with one rule that stayed in every brief after it: never lower the quality to make the city run faster. Optimize instead. Originally, I also told the agent to not rewrite the initial eight camera shots and instead decorate what existed. Two days later, I contradicted myself. I wanted people to drive and walk the city someday, and that could never happen in an environment built for eight camera angles. So I had it rebuilt as a place: one street network at true scale, with every side a driver or walker can see actually built, instead of left blank behind the camera. Even the graffiti got a rule: no tag can be read as letters, so nothing in the city accidentally spells a word.

One agent in one Blender window could never build that. So the agents built a pipeline around headless Blender, which ran from a command with no window and allowed every builder (a subagent) to rebuild its own district from a script at the same time. A coordinator agent held the brief and handed out the districts, while each builder rebuilt its own copy of the project. The live city took 20 days: ten districts on one loop you can drive, from Japantown and Kabuki Avenue to Corpo Row and the Megabuilding. 

The first evening, 17 agents were running on my personal Claude plan when it hit its usage limit. All 17 stopped mid-task and lost whatever they hadn't saved. After that, I learned to simultaneously run five at most. Later, that became two builders at a time, each on a short task that ended in a commit, so if a sudden stop happened, it only cost one task.

Despite my precautions, the next day, the coordinator itself crashed. Every image it opened stayed in its working memory, and it had been opening renders for hours. Its brief had always told it to keep a progress file current "so a fresh thread can resume from it alone." So I started a new thread with one new rule, never open an image, and it picked up from the file where the old one died. The crash itself was a known Claude Code connection bug, long sessions dropping with [ECONNRESET](https://github.com/anthropics/claude-code/issues/98032), that I had no control over.

## The test driver

A render only shows what a camera sees, and visitors drive and walk wherever they want. So part of my judge panel played it live in a real browser, like a visitor would.

Alongside the drivable city, I built a braindance mode for the site. A braindance is Cyberpunk's word for a recorded memory you replay, and mine is a four-minute night you can scrub through and scan for clues. Astra, an OpenAI model that can work a browser via computer use, meaning it looks at screenshots of the page, clicks buttons, and presses keys the way a human visitor would, in ways I never believed were possible, played it through ten checks and failed it, starting with a clue card that covered the end screen. The fixes went in, it played it again, and it passed. 

For the city, the agents wrote their own test rig, which presses real keys in a browser with no window. Its last run drove my S4 down every street both ways and walked every pavement on the loop, 7.4 km on foot, and counted zero times stuck and zero falls through the world. Before that, the agent running the test drives traced several blocked spots, some of which weren't the city's fault. Instead, the test's own driver was cutting corners into oncoming traffic. A judge only reports what it measures, and that one partly measured its own driving. On the next run, it made the rig hold its lane through every corner, and those spots cleared.

## Thirty hours at a 7

Playability checks told me the city did not trap the player. They could not tell me whether it looked good. The rebuild also got a judge panel, which were models that each knew one part of the build and judged them based on extensive criteria. Two had to score every district at least 8 out of 10 on every line of a scoring sheet.

This was the sheet, with scores like the ones that sat at 6 and 7 for thirty hours:

```text
Japantown              two fresh reviewers, each line 1 to 10 against frames from the game
                                                                       A    B
silhouette             the skyline and massing against the frames       7    7
density and layering   near, middle and far depth; how full it is       6    7
signage                kinds, density, placement, angle, colour         7    6
colour and light       the palette, where light comes from              7    7
street detail          what a walker passes at kerb level               6    6
life                   people, traffic, movement, flicker               6    7
finish                 no seams, voids, floating or unlit pieces        7    7
plus the three worst things.
Done at 8 or more on every line from both. Not done.
```

The rest of the panel judged renders, and its question was whether the city was any good. Round after round, the scores sat at 6 and 7 for about thirty hours. The log's words for one district were "barely moved."

A 7 never told a builder what would make it an 8. Every round a fresh reviewer answered "how good is this?" with its own taste, so the number measured the reviewer as much as the district. So I changed the question to "what is broken?" Sol, OpenAI's model on my Codex plan, got the build and one ask: list up to five things a visitor would call broken, like a hole, open sky at street level, or a floating piece. 

Those thirty hours ran on my personal Claude plan, whose weekly limit, once hit, ends a run for days. My university, Northeastern, pays for a separate Claude Premium seat. Its limit resets every five hours without a weekly cap. It was the purple-fans problem again, a limit in my way. I had the coordinator drop its swarm of Claude reviewers and gave each job to the account whose limit fits it, a split that in theory lets my agents run forever.

The coordinator, on my Max plan, only hands out one task at a time. It never opens images, so it barely touches the weekly cap, and if it crashes a fresh thread picks up from the progress file. The builders, Claude Opus on my Northeastern seat, do the heavy work two at a time; when a five-hour window runs out they move to the Max plan, and a clock moves them back. The reviewers, mostly Sol on my Codex plan and never the agent that built the piece, send defects back until the build is clean.

<figure>
<img src="/blog/night-city-final/workflow-v2.png" width="560" height="1096" loading="lazy" style="display:block;margin:0 auto;max-width:100%;height:auto" alt="Diagram of how each build runs. A loop of three stations: the coordinator, Claude on my Max plan, hands out one task each; builders, Claude Opus on my Northeastern seat, at most two at once, do the work; reviewers, mostly Sol on my Codex plan and never the builder, send defects back until it is clean. I set the ask and the bar and take the final look. A key gives each account's limit: the Max plan has a weekly cap, so the coordinator only decides and never opens images; the Northeastern seat has no weekly cap; when its five-hour window runs out, builders move to the Max plan and a clock moves them back. A progress file lets a fresh coordinator pick up after a crash.">
<figcaption>How every big build of mine runs now. Each color is one account, doing the job its limit suits.</figcaption>
</figure>

I made it my workflow for everything and wrote it down as a skill, a playbook an agent loads when a task matches it, called orchestrate-trifecta.

Then a run I set up to operate until the job finished stopped and sat waiting for me. The coordinator wrote a five-hour stop into its own plan. I had to step in, so I took the time caps out of the skill and let the agents boil the ocean, with room to keep raising the bar. These are the skill's rules for when to stop ("his" is me):

```text
- Ask for defects, not a score: up to five, ranked, ... Scores do not converge.
- One review, the fixes, one confirming review, then close the item.
- No time caps. Do not write "stop after N hours" into a goal, a plan or a child's brief.
- Stop only for what is his alone: merging to main, spending money,
  anything outward-facing, or a change to what the work is.
```

I learned to write skills like this by hand, and for that reason, they make the most sense for my exact setup. I think there is value for everybody to write skills that fit their own niche use cases. I open-sourced it as [orchestrate-trifecta](https://github.com/whoisaldo/aldos-agentic-workflow/tree/main/skills/orchestrate-trifecta), part of my aldos-agentic-workflow repo. Everyone is juggling different plans and reset windows, so you set which account coordinates, builds and reviews in one config file instead of copying my exact setup.

The skill got its first big test on my other car.

## The S6

It's a grey 2013 Audi S6, and the brief started with what mattered: "Main thing is to replicate my exact car." I sent photos once again.

A builder on the Northeastern seat modeled the body from scratch overnight. Sol reviewed every round and sent back defects: "front bumper loses S6 face around grille/intakes; body patches tear/pinch at joins; rear tall blank slab." The builder fixed them, and Sol looked again.

By morning Sol passed it: "Yes. The car is fit to show visitors in the garage now."

About an hour later I looked at it and told the agents it was horrible. The grille was a flat panel of dots, and the side of the car was one smooth slab.

<figure>
<div style="display:flex;gap:8px;flex-wrap:wrap"><img src="/blog/night-city-final/s6-approved.jpg" width="1600" height="1000" loading="lazy" style="flex:1 1 280px;min-width:0;width:100%;height:auto" alt="The S6 the AI reviewer approved, in the garage. Its grille is a flat panel of dots and its side is one smooth slab."><img src="/blog/night-city-final/s6-final.jpg" width="1600" height="1000" loading="lazy" style="flex:1 1 280px;min-width:0;width:100%;height:auto" alt="The S6 that replaced it, in the same spot and light, with a dark honeycomb grille."></div>
</figure>

Sol was checking whether parts of the car were broken, the question I'd taught it to ask. I was checking the first line of my brief. It's a clean grey sedan, and fixing every blocker didn't make it my car.

My own loop had worked as built and still passed the wrong car. The S4 agent had my old model to start from. For the S6 I'd given it nothing but my photos, too thin for any model to know my car, so it invented a body from scratch. To resolve this, I fed it more photos and a free online model of an Audi A6. Since rebuilding the entire car model wasn't the main objective, a relatively similar car worked to give the agent a base to work off. This particular blocker wasn't a blocker worth circumventing and making the agents rebuild it from scratch, although I do believe the agents could've reached a better model. 

The agent reshaped the A6 model into my S6 by moving its points, the corners its surfaces are stretched between, so nothing was cut away or patched over. It added my honeycomb grille, lamps traced from my photos, the quad tips and the engine bay, and built my exact car, one for one. Look at the bumper's corners and you'll see it isn't perfect.

I set the bar high again and brought the judges back in. This time my photos and my S4 were Sol's standard for what counted as broken. It called the new base a "CLEAR STEP UP" and still found four things broken, and the builder fixed those too.

That evening I told the coordinator I was satisfied. Not only did the model outcome meet my high bar, but I also ran low on usage on my Max plan. Sol could find what was broken, but only I could say whether it was my car. So the coordinator dropped the confirming review it had planned, and wrote down why: "Ali is the judge of the look."

It's parked in [the garage](/playground#garage). Go judge it yourself.
