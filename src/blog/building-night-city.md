---
title: I built a 3D Night City with zero Blender experience
date: 2026-10-24
summary: I had never used Blender, I knew nothing about three.js, and outside of tweaking Roblox models I never really did 3D. I built a full 3D Night City anyway, by giving AI agents the best tools and setup I could.
---

<figure>
<video controls playsinline preload="metadata" width="1920" height="1080" poster="/blog/building-night-city/poster.jpg" src="/blog/building-night-city/reel.mp4" aria-label="Launch reel: a flight through the 3D Night City on this site"></video>
</figure>

There's a full 3D Night City on this site. It lives at [/playground](/playground), and it has ten districts, about seven thousand people walking around on a desktop, street traffic, flying cars, delivery drones, a police AV, trains on two elevated lines, rain, thunder, and my own two cars parked in a garage you can fly into. The live city took 20 days. The whole thing, from the first yellow-and-black theme to the version you can get out and walk around in, took about seven weeks.

Before this I had never touched Blender, and I knew nothing about three.js. Outside of tweaking models for my Roblox games, I never really did 3D at all. AI agents built it, and my job was to set them up so they could.

This is the full story. Why Cyberpunk, where I was starting from, what I actually did every day, what went wrong, and what I learned.

## Why Night City

I'm a huge Cyberpunk fan. I loved the game, and what got me was how beautiful and how insanely alive it was. People moving, people arguing, cars driving, so much going on at once. The whole idea of being an edgerunner always stuck with me too.

I think that's because of how I grew up. I always did shit on the edge. When I was young I figured out how to make a mod for Minecraft. At 12 I was scripting for people on Roblox I barely knew, barely knowing how to code myself, and learning a ton because of it. I did random things just because I was curious, and they were never what other kids were doing. I spent my free time cracking open my router because I wanted to see what the inside looked like.

At 14, during COVID, came the GPU shortage, when nobody could get components at all. I was stuck on a horrible Ryzen APU and really wanted a dedicated graphics card. That wasn't realistic, and not only because of the shortage. I was young and broke.

So I spent hours convincing my grandma. She already knew I was a tinkerer who was always up to something, but she believed in me. She thought most of what I did came from a lazy but smart place, and she really did see me as a smart kid. She lent me exactly enough to buy an RX 6700 XT, which was around $500.

Then I had to actually get one. Brands hadn't started the waitlist-style launches that let real enthusiasts buy a card, the kind Zotac later ran for its Nvidia cards. It was a shitty process, every man for himself. I'd heard sneaker drops always had this exact problem, and there was already a big market for bots that bought shoes. So I watched YouTube tutorials on building Python sneaker bots and wrote my own, tailored to one job: buying a single GPU for myself on launch day.

It worked. I got the card, which at the time was genuinely insane. That's when I realized how much I appreciated the feeling of solving a real problem for myself with just code and a lot of diving deep into it. I got PS5s for my friends and me the same way, and even a 3060 Ti for my little brother.

I connected to that whole edgerunner idea. The premise of running too close to the edge always felt cool to me.

Night City itself is just a really cool idea. It's a dystopian tech city, and life there is horrible for most of the people living it. I don't idolize that. It's the same way I felt reading 1984 when I was young. The life in that book wasn't something I wanted. I was just in awe that a world like that could exist on the page, and it scared me a little.

## Where I was starting from

I always wanted to do 3D work, build 3D shit. I just never picked it up. For the Roblox games I made, I either paid someone to build the models or took one from online and tweaked it myself, and all of that happened inside the Roblox Studio editor. I had never touched Blender. I know my frontend stack, but three.js was completely new.

What I actually am is a systems and backend engineer. At Amazon Web Services I was a Software Development Engineer Intern on the CloudFormation Registry, where I owned policy-based sharing of private resource types across an AWS Organization, from the design all the way to production Java across 12 merged code reviews. There's [a full write-up of it](/work/aws-cloudformation). At Philips, as a Software Development Engineer Co-op, I built zero-touch Windows deployment for about a thousand industrial PCs while FDA-regulated UEFI Secure Boot stayed on the whole time. That one has [a case study](/work/philips-zero-touch) and [its own post](/blog/zero-touch-secure-boot). On my own time I'm building [Eternal Monitor](/work/eternal-monitor), a Rust host and SwiftUI iPad client that turns an iPad into a wireless second display for Windows, with hardware H.264 encode and decode end to end.

None of that is 3D.

## My job was the environment

Day to day, the work was figuring out how to give the AI the best tools and the best orchestration I possibly could. I'll be honest, I didn't read much of the code. I focused on setting up the perfect environment for the agent and letting it build.

I used T3 Code so I could stay in the loop all the time, even in class. When something in Blender needed a quick fix by hand, I used Parsec to see the actual Blender window and made the edit myself. I learned how `/loop` and `/goal` work so I could do this properly. I started all of this with Astra, and over time I learned so much about how this shit actually works. By the end I had loops running, goals running, an agent judge panel doing the reviews, literally anything I could think of to get to perfect.

The big runs settled into a shape. One coordinator thread held a brief and a progress log. It handed work to builder agents, sent what they made to reviewers who hadn't watched it being made, and looped fix rounds until the work cleared the bar. At the peak there were 17 agents running at once. On October 12 alone the repo took 400 commits. The world is 1,063 commits in total, which is 91% of this site's entire history.

Things broke, too. The coordinator crashed once from looking at too many images, so the brief got a line that stayed for the rest of the run: the coordinator never opens an image. Builders render, reviewers look, and the coordinator reads their notes. The agents also wrote their own test rigs. One of them drove the S4 around the city on 15 routes and walked 34 more, 7.4 km on foot, and counted zero times stuck and zero falls through the world.

Most of what I focused on came from trial and error, from noticing what produced good results and doing more of it. I also learned a lot from people in the industry, like Jarred Sumner, Bun's creator, who [ported Bun from Zig to Rust](https://github.com/oven-sh/bun/pull/30412) with Claude, and Theo, who I watched a ton.

## Boil the ocean

The agents half-assed shit often. I had to really plan out the entire path and the execution flow for the agent.

What I learned is that agents are beyond capable. It really comes down to the user, and how well the user lets the agent "boil the ocean". That's a quote I got from Theo.

When things went badly, it was because I didn't build that path properly. I didn't take my time and structure the whole plan. The agent could half-ass something. It wouldn't hallucinate, exactly, but it could go down the wrong path, and this was a very, very long-running task. It took weeks, believe it or not. It could have gone faster if I'd approached it better from the start. It also could have gone way slower if I'd just handed it off without thinking about how to set it up for success.

It felt like being an experienced software manager handing an intern a perfect path to success, with the tools and everything else they'd need. I'm not experienced like that. I was experienced in ambition and human thought.

## Opus 5.5, Astra and Sol

Working with Opus 5.5 and Astra taught me how differently models really work. Astra is thorough and it's judgmental. It was willing to go forever and never stop judging, which was great for how badly I wanted this to be perfect. Opus 5.5 was perfect at edge cases and at fixing things. Astra could find problems Opus couldn't see, but Astra couldn't fix them as perfectly as Opus could. The builders in the big runs were Opus 5.5.

Astra genuinely wowed me sometimes, especially when I needed real computer use. When the braindance mode was built, Astra drove it in a real browser through ten checks, took 32 screenshots, and failed it with three findings: a clue card covering the end screen, the radio credit hidden under the timeline, and a marker with no hover label. After the fixes it ran the check again and passed it.

Most of the reviewing in the later runs went to GPT-6.1 Sol. In the garage run it was 34 Sol reviews to 4 from Claude. At one point the agents found that 251 of the 395 people standing around Corpo Row were under the floor. The city brief said every reviewer had to score the work 8 or higher, and the scores sat at 6 and 7 for about 30 hours, until the coordinator traded that bar for a closing plan.

The S6 in the garage went like this. Overnight, an Opus builder modeled the body from scratch, and Sol reviewed it round after round. Sol kept saying no. Then one review came back with "Yes. The car is fit to show visitors in the garage now." About an hour later I looked at it and told the agents it was horrible. We rebuilt it from a proper base mesh, reshaping the base's own vertices into my 2013 S6 instead of cutting and patching, then added my RS honeycomb grille, lamps traced from my photos, the quad tips and the engine bay. By that evening I was pretty satisfied with it.

## Blender, with an agent driving

Blender MCP lets an agent run Python inside a live Blender session, render what it built, and keep going.

My S4 came first. My prompt for it is still in the repo, and it said my old model was "honestly horrible" and asked the agent to "make sure it's a 1 of 1 replica". It rebuilt my actual car in Blender through the MCP from my photos and measurements, down to the RS4 front bumper, the 20-inch wheels, the AWE quad tips, and a hood on a hinge with a gas strut that opens in the garage.

The city went the same way, much bigger. It started as one Blender script of 1,287 lines and grew into a kit with one module per district, a street builder, a building generator and a library of props. By the end the Blender builders were 65,411 lines of Python, and the final scene had 1,821 objects and about 1.4 million triangles. Once the kit was solid, the agents switched to running it in headless Blender, because that was faster and safer than going through the MCP every time.

Not every 3D object came from Blender. The flying cars and the street cars came from Codex, with GPT-6.1 Sol modeling them straight in three.js. The flying car ended up at 2,424 triangles after one round of review, and each street car is about 1,700.

## The eddies

Codex image gen did a huge amount of the 2D work. The 24 billboard adverts dealt across the city, the shop interiors you see through the glass, the holographic koi, the facades, the plates in the intro. It also did the custom logos for the eddies.

Eddies are Night City's money, and the About card on the playground ends with "Will do hard job for Eddies". I needed a mark for them, and I didn't have a good one. The SVGs the agents wrote for it were really bad. Below is the one that shipped on the playground's About card, next to the one Codex's image model made for the homepage. Drag the seam and judge for yourself.

<figure>
<div data-embed="eddies-compare"></div>
<figcaption>Drag the seam or tap the stage, or focus the seam and use the arrow keys. The zoom buttons scale both marks around the seam.</figcaption>
</figure>

The Codex one is the sticker on the homepage now.

## Two Claude accounts and a skill of my own

Running this many agents for this long means running into usage limits. On October 11, limits killed 17 agents at once.

I have two Claude accounts. One is my personal Claude Max plan, which has a 5-hour usage window and a weekly cap. The other is a seat through Northeastern University, where I study, and that one only has the 5-hour window. No weekly cap. So I load balance between the two.

That turned into a skill I wrote myself, called orchestrate-trifecta, and I run my big builds with it now. A thread on my Max plan coordinates. It plans, splits up the work, writes the briefs and makes the calls. The builders run on the Northeastern seat. GPT-6.1 Sol on my personal Codex plan does most of the reviews, and Claude does the rest. When Northeastern's 5-hour window runs out, the builders move over to Max and come back when it resets. Nothing a builder makes gets accepted until an independent reviewer has checked it.

I learned to write skills like this by hand, and honestly they only make sense for my exact setup. It's really important that people write skills that fit their own niche use cases.

## The small stuff is my favorite part

My favorite part is how detailed it is. The alleyways have tiny graffiti on the walls. There are people walking around everywhere. There's so much small detail, and the huge number of subagents handled it really well.

Some numbers. 7,035 people on a desktop and 3,342 on a phone. 44 street cars, 12 flying cars and 8 delivery drones. 34 traffic signal heads on a 40-second cycle. Ten districts on a 2,983-meter loop that you can actually drive.

Take the graffiti. One commit made sure no tag on any wall can be read as letters, so nothing in the city accidentally spells a word. Another deals a wall's marks in turn, so the same piece never shows up twice within 20 meters. Japantown's lane walls are pasted from knee height up to the cables with fly-posters, bills, stickers and fuse boxes.

## Go try it

Everything above is live, so go see it.

- **[The playground](/playground).** The door has my S4 turning in a small studio, and you can drag it to spin it. Pick "Enter with sound" if you can. The intro is a voxel moon, meteors and a dive into the street, and the S4 drifts in on the drums. Then scroll, and the camera flies between the avenue, the billboard plaza, Corpo Row, the rooftop, the garage and the moon. Press H to look around, C to let the site fly itself like a film, and P to save a postcard of the frame.
- **[The garage](/playground#garage).** The camera flies in through the workshop door and stops at six stations, both cars and both engine bays, where the hood opens as the camera rises over it. Click or tab to the markers on each car to see what's been done to it.
- **[The braindance](/braindance)**, on a desktop. It's a 4-minute recorded night in Night City, in seven chapters, that you can play, pause, scrub and rewind. 1, 2 and 3 switch between the visual, audio and thermal layers, and there are 45 clues to scan, three of them secret. Press G to get out of the recording and drive the S4 around the whole loop, then F to get out and walk.

Phones get a lighter version of the same city and garage. The braindance needs a desktop.

This project really taught me so much about how to properly code with AI. Most of what I learned is about the path you set up for the agent before it starts.
