# Support community map

This is the source code for the [COVID-19 local support community map](https://www.policerewired.org/home/covid-19/communities), developed by volunteers from [Police Rewired](https://policerewired.org) and other communities operating through the [London College of Political Technologists](https://nwspk.com).

* To find a local support group: [View the map page](https://www.policerewired.org/home/covid-19/communities)
* To join the wider crowdsourced community, see: [The Coronavirus Tech Handbook](https://coronavirustechhandbook.com)

![screenshot of the map](screenshots/002-browser-frame.png)

## Developers

To modify this site:

* First, fork it on GitHub.
* Make modifications.
* Once ready, commit and push to GitHub.
* Submit a pull request with your commit.

You can test by serving the site to yourself on localhost:8000. (The Google Maps referer is set up to allow this.)

### Forking

* Fork using the github site - there's a fork button.
* Clone your own fork - you can get the url from the clone button on your fork's page.
  ```bash
  git clone https://github.com/YOU/YOUR-REPO.git
  ```
* Now you can edit the code in your local repo.

### Making changes

_NB. This short guide does not include help around using different branches. Branches are an easy way to work on individual features and keep them separate until they're ready to merge. You should read up on them if you'd like to use them. They're not necessary for the simplest work on small repositories._

* Once you've made a change, stage the changes:
  ```bash
  git add --all
  ```
* Now you can create a commit on your fork:
  ```bash
  git commit -m "your message about what changed in this commit"
  ```
* You can accumulate any number of commits.
* Periodically pull if there's a chance your repository has updated and is ahead of you.
  ```bash
  git pull
  ```
* When ready, push all the commits you have to your repository.
  ```bash
  git push
  ```
* Your repository now has all your changes.

### Submitting a pull request

* Visit your github repository's page.
* There you'll see a **New pull request** button.
* Use that to submit a pull request of all your changes.
* Add some comments explaining what you've done and why.

### Keeping in sync

Set up your local repo to have an additional `upstream` remote...

See: [configuring a remote for a fork](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/configuring-a-remote-for-a-fork)

* To view the current remotes for your repository:
  ```bash
  git remote -v
  ```
* Add ours as an extra remote called `upstream` with:
  ```bash
  git remote add upstream https://github.com/policerewired/cvth-groups-map.git
  ```

To sync, you'll first _fetch_ the upstream remote, and then merge it into your own repository by branch.

See: [syncing a fork](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork)

These instructions assume you're on the master branch.

* Fetch the upstream:
  ```bash
  git fetch upstream
  ```
* Merge the upstream master with your local master:
  ```bash
  git merge upstream/master
  ```

### OS X localhost server

Under OS X, to serve the site to yourself, you can use:

```
python -m SimpleHTTPServer 8000
```

If you have Anaconda Python installed, instead use:

```
python3 -m http.server 8000
```

### Libraries

The map uses the Google Maps javascript API, with data sourced from [this crowdsourced sheet](https://docs.google.com/spreadsheets/d/117ukLjXiz8EfMjP-q9Aiu5XepQ39XK1W4DTMsE87llw/edit?usp=sharing) of communities.

jQuery is used to facilitate a quick and dirty call to retrieve the sheet's data in CSV format. The jQuery-csv plugin is then used to construct objects from the CSV data, which are then plotted to the map as markers.

* [jQuery](https://jquery.com/)
* [jQuery-csv](https://github.com/typeiii/jquery-csv)
* [Google Maps javascript API](https://developers.google.com/maps/documentation/javascript/tutorial)
