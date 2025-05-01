# Pues Sobrevivamos
#### Arcade turn-based survival strategy

Help a group of survivors in a post-apocalyptic world through a simple web form with no graphics.


## How to run
To run the container in local:
1. Modify the ports in docker-composer.yml if your local HTTP/S ports are busy.
2. Add your HTTPS certificate keys on the `crt` folder.
3. Or modify the redirect lines at `nginx/nginx.conf` to use HTTP only.
4. `docker compose up`


## Project history
- Around 2000, this was one of my first Programming projects, with a few buttons and inputs and few logic.
- Many years later I remade it as a web, with Python / Flask.
- But around 2013 Node.js got all the hype, and I remade this game again with Express.
- In 2025 I missed my portfolio enough to bring my old projects back to life. (This was the easiest one). I added Docker to maintain the same library versions, and updated a couple of things to keep it working in current browsers.


Built with:
Node.js, Express, Jade, jQuery, Bootstrap, TouchSpin

Sound effects:
https://opengameart.org/content/ticking-clock
https://opengameart.org/content/church-bell


> Original executable (English):
> https://mfi.re/download/dvzb8qglw6hkgnp/ThenLetsSurvive03.7z

> Original executable (Spanish):
> https://mfi.re/download/j9bfwgca52z29mw/PuesSobrevivamos03.rar

> (From Delphi 6. No dependencies. It will probably not open on Windows >=Vista without any tweaks. No problem with Wine)

> Instructions (English):
> https://docs.google.com/document/d/1BjqkJ2OBo47FrYEVMpwbxoaB-GOSuUFA1wktSfEJQe0/edit

> Instructions and older project (Spanish):
> https://docs.google.com/document/d/19MnUjWBCBeP2NU70I5uUUQ1os4a7WS-BEc4WVih58NE/edit
