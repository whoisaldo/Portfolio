---
title: Zero-touch Windows deployment with Secure Boot still on
date: 2026-10-17
summary: How a thousand-PC imaging job went from a USB stick per machine to zero-touch network boot without Secure Boot ever turning off.
---

I spent most of my co-op at Philips on one problem. Every refresh cycle, about a thousand industrial PCs had to be reimaged by hand: a technician brought each machine up, plugged in a USB stick, and ran scripts off a network share.

Plenty of engineers had wanted to automate it, and nobody had shipped it because of one requirement. These machines run software that is part of an FDA-regulated medical device platform, and that software needs UEFI Secure Boot on the whole time, not just flipped back on at the end.

## Why Secure Boot breaks network boot

Network booting is simple on paper: a machine powers on, asks DHCP where to boot from, pulls a small program over TFTP, and runs it to fetch the next stage. With Secure Boot on, the firmware refuses to run that first program unless it's signed by a key the firmware already trusts, which out of the box means Microsoft's keys and the hardware maker's. Most open-source network boot tooling is unsigned or signed with your own key. Normally you'd just turn Secure Boot off for imaging and back on afterward, which wasn't allowed here.

## Attempt one: bring our own signature

My first design used the chain a lot of Linux distributions rely on. The firmware loads shim, which Microsoft signs. Shim loads a second-stage bootloader signed with our own key, iPXE here, which pulled a boot menu over HTTP, then wimboot, then Windows PE.

It did boot a Secure Boot machine into Windows PE over the network, after some weird debugging. One bug was a web server routing issue that quietly corrupted the payloads it served. Another was a path that differed by letter case: the server answered the EFI binary request with a redirect to a login page, the bootloader downloaded the page, and the machine tried to boot HTML. A login page is a valid HTTP response, and nothing on screen tells you the machine is trying to boot a web page.

What killed the design was key enrollment. Shim only trusts a custom key once it's enrolled as a Machine Owner Key, which takes a person at the console pressing keys on first boot on every machine. A thousand keypresses is still a thousand visits, just shorter ones, so it wasn't zero-touch. I archived the whole chain with a runbook to restore it, in case whatever replaced it ever needed a fast rollback, and started over.

## Attempt two: let Windows boot Windows

Instead of adding our own key to the chain, I looked at what network boot program the firmware is already guaranteed to trust: Windows Boot Manager. `bootmgfw.efi` is signed by a Microsoft certificate authority that every Secure Boot firmware shipped since 2012 trusts by default.

Windows Boot Manager can also boot from a RAM disk. Give it a BCD store with the right entry and it pulls `boot.sdi` and `boot.wim` over TFTP, then starts Windows PE from memory:

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

Nothing gets enrolled and nobody touches the keyboard. The firmware checks a signature it already trusts and moves on.

Three supporting pieces sit around that chain.

**proxyDHCP, not DHCP.** The corporate network already had DHCP servers, and I had no business touching IP allocation. Running dnsmasq in proxyDHCP mode answers only the PXE side of the handshake (which server and which file) while IP addresses still come from the real DHCP servers.

**A thin bootstrap and a fat orchestrator.** Rebuilding a WIM is slow; editing a script on a share takes a minute. The bootstrap baked into `boot.wim` only brings up the network, maps a share, downloads the current orchestrator script, and runs it, so nearly all the logic lives where it's easy to change.

**A small API for identity.** The orchestrator asks a FastAPI service who it is, keyed by MAC address. The service returns that machine's configuration and records deployment status through each step, so you can watch a batch run instead of walking the floor.

## Working around a locked installer

The vendor's installer was locked, so I couldn't change it, and it relied on `wpeutil` (a Windows PE utility) to check whether the machine had booted UEFI or legacy BIOS. Under the new boot chain that call failed, and the installer stopped.

I wrote a small self-contained .NET program, dropped it into the boot image under `wpeutil`'s name, and renamed the real binary beside it. When the installer makes the failing call, the stub returns success without doing anything; every other call goes straight through to the real utility untouched. A registry value written before the installer starts gives it the firmware answer it was looking for.

## Keeping paths from drifting

Different hardware revisions ask the server for boot files at different paths. Rather than hoping each one asks the right way, identical copies of the BCD store sit at every path firmware might request, and the boot image is hardlinked across all of them. Editing the image updates every path at once, which beats spending an afternoon chasing down two copies that drifted apart.

## The result

Roughly a thousand technician visits per refresh became machines that image themselves from power on, with Secure Boot staying on the whole time. I presented the design and a live run to more than fifty engineers and stakeholders, and went back to the same team part-time after the co-op.
