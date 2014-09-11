#Introduction

**GenoTouch** is a fledging project that I have been working on on and off for some while. For many years I have been writing 'Report Generator' scripts under the username **_genome_** for [GenoPro](http://www.genopro.com) of which I am a strong supporter but frustrated at the lack of development.

The long term aim of this project is to provide an open source tool for displaying and editing genograms based on GenoPro's .gno data files.  I have experimented with a number of javascript libraries for more than a year but have settled on **JointJS**, an excellent graphics library for generating SVG diagrams which utilises **jQuery, Backbone,js and Underscore.js** libraries. I am also using **jQuery Mobile** for touch based widgets.

#How it works

Firstly a GenoPro Report Skin is used to convert GenoPro XML data to JSON format (well JSONP actually).
Then JointJS, jQuery Mobile and some more javascript is used to render each GenoMap.

The rendering process is quite slow so the intention is to save the rendered genograms in JSON format for future display.

I hope to publish a demo shortly. Watch this space!

#Contributions

Any help with this project would be much appreciated.  My programming skills are wek, rooted way back in the 70s with COBOL and assembler. I struggle to get to grips with new fangled techniques, so development is a slow iterative process to discover what works and what doesn't.
