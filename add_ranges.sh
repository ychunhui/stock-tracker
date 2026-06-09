#!/bin/bash
# Add day and year range to all stock cards in index.html

sed -i '' 's|<p class="stock-change">--</p>|<p class="stock-change">--</p>\
                            <p class="day-range">Day: --</p>\
                            <p class="year-range">52W: --</p>|g' index.html

echo "Added range elements to all stock cards"
