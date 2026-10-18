---
title: Zero-touch Windows deployment with Secure Boot still on
date: 2026-10-17
summary: How a thousand-machine imaging job went from a USB stick per PC to power on and walk away, without Secure Boot ever turning off.
---

At Philips I spent most of my co-op on one problem. A fleet of about a thousand industrial PCs had to be reimaged every refresh cycle, and every one of them needed a technician. Somebody brought the machine up, plugged in a USB stick, and ran scripts off a network share. A thousand machines meant a thousand visits.

Plenty of engineers had wanted this automated. Nobody had shipped it, and the reason was one requirement. These machines run software that is part of an FDA-regulated medical device platform, and that software needs UEFI Secure Boot on. Not on at the end. On the whole time.

That one line rules out most of the usual ways to image a fleet. This is how I got around it, including the version I threw away.

## Why Secure Boot makes this hard

Network booting is old and well understood. The machine powers on, asks DHCP where to boot from, pulls a small program over TFTP, and runs it. That program then fetches whatever comes next.

With Secure Boot on, the firmware only runs that first program if it is signed by a key the firmware already trusts. Out of the box that means Microsoft's keys and the hardware maker's. Most open-source network boot tooling is unsigned or signed with somebody's own key, so the firmware refuses it. The usual fix is to turn Secure Boot off for imaging and back on afterwards. Here that wasn't allowed.

## Attempt one: bring my own signature

The first design used a chain a lot of Linux distributions rely on. The firmware loads shim, which Microsoft signs. Shim loads a second-stage bootloader signed with our own key, iPXE in this case, which pulled a boot menu over HTTP, then wimboot, then Windows PE.

It worked. A machine with Secure Boot on came up into Windows PE over the network, which proved the idea. Getting there took some of the strangest debugging I've done. One problem was a web server routing issue that quietly corrupted the payloads it served. Another was a path that differed by letter case. The server answered the request for the EFI binary with a redirect to a login page, the bootloader downloaded the login page, and the machine tried to boot HTML. Nothing on screen tells you it is booting a web page. It just fails.

The design died on something more basic. Shim only trusts our key once it is enrolled as a Machine Owner Key, and enrolling it takes a person at the console pressing keys on first boot. Once per machine. A thousand keypresses is a thousand visits again, just shorter ones. That isn't zero touch, so I archived the whole chain with a runbook to restore it and started over.

## Attempt two: let Windows boot Windows

The question that unlocked it was simple. What network boot program is the firmware already guaranteed to trust? Windows Boot Manager. `bootmgfw.efi` is signed by a Microsoft certificate authority that every Secure Boot firmware shipped since 2012 trusts by default.

Windows Boot Manager can also boot from a RAM disk. Given a BCD store with the right entry, it pulls `boot.sdi` and a `boot.wim` over TFTP and starts Windows PE from memory. So the chain became:

```text
power on, Secure Boot on
  -> proxyDHCP answers with the boot file name
  -> TFTP delivers bootmgfw.efi        (Microsoft-signed)
  -> BCD store, RAM disk entry
  -> boot.sdi + boot.wim over TFTP
  -> Windows PE
       -> bootstrap script baked into the image
       -> fetch the current orchestrator and run it
       -> host config, drivers, vendor installer
  -> reboot into Windows, first-boot setup
```

Nothing gets enrolled and nobody touches the machine. The firmware checks a signature it already trusts and carries on.

A few pieces around that chain matter as much as the chain itself.

**proxyDHCP, not DHCP.** The corporate network already had DHCP servers, and I had no business touching IP allocation. dnsmasq in proxyDHCP mode only answers the PXE part of the conversation: which server, which file. Addresses still come from the real DHCP servers.

**A thin bootstrap and a fat orchestrator.** The script baked into `boot.wim` does as little as it can. It brings up the network, maps a share, downloads the current orchestrator script, and runs it. Rebuilding a WIM is slow. Editing a script on a share takes a minute. So nearly all the logic lives where it is easy to change.

**A small API for identity.** The orchestrator asks a FastAPI service who it is, keyed by MAC address. The service hands back that machine's configuration and records deployment status as each machine moves through the steps, so you can watch a batch go instead of walking the floor.

## The installer that broke

The vendor's installer was locked. I couldn't change it, and it assumed things about the environment it ran in. One of them was that a call through `wpeutil`, a Windows PE utility, would tell it whether the machine had booted UEFI or legacy BIOS. Under the new boot chain that call failed, and the installer stopped.

So I wrote a small self-contained .NET program and put it inside the boot image under the utility's name, with the real one renamed beside it. When the installer makes the call that fails, the stub returns success without doing anything. Every other call goes through to the real utility untouched. A registry value written before the installer starts gives it the firmware answer it was looking for.

The installer never changed. The broken call just stopped being in its way.

## The boring parts that keep it working

Different hardware revisions ask the server for boot files at different paths. Instead of hoping each one asks the right way, identical copies of the BCD store sit at every path firmware might request, and the boot image is hardlinked across all of them. Edit it once and every path sees the edit. Two copies of a boot image drifting apart is the kind of bug that eats an afternoon, so I made it impossible rather than relying on being careful.

The first chain is still archived with a documented way back to it, in case the new one ever has to be rolled back in a hurry.

## What I'd tell someone trying this

Look for what is already trusted before you add trust of your own. I put real time into making a custom signature work, and the answer was a file every Windows machine already has.

When a boot fails and the screen says nothing useful, check what was actually downloaded. A login page is a perfectly valid HTTP response.

Keep the part you can't change small, and move everything else somewhere you can edit in a minute.

In the end, roughly a thousand technician visits per refresh became machines that image themselves from power on. I presented the design and a live run to more than fifty engineers and stakeholders, and after the co-op I went back to the same team part-time.
