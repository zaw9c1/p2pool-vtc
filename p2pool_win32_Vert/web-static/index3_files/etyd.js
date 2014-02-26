function init() {
    d3.selectAll("#tracker_input").attr("value", trackerAddress);
    d3.json("/web/version", function (e) {
        d3.selectAll("#version").text(e)
    });
    d3.json("/web/currency_info", function (e) {
        d3.selectAll(".symbol").text(e.symbol)
    });
    d3.json("/fee", function (e) {
        d3.selectAll("#pool_fee").text(e + "%")
    });
    updateStats();
    setInterval(function () {
        updateStats()
    }, 8e3)
}

function updateTracker(e) {
    trackerAddress = e.value;
    localStorage.vtcTrackerAddress = e.value;
    updateStats()
}


function calcDiff(e) {
    return (4294901760 * Math.pow(2, 256 - 64) + 1) / (Math.pow(2, 256) / e + 1)
}

function values(e) {
    res = [];
    for (var t in e) res.push(e[t]);
    return res
}

var period = "day";

function updateStats() {
    var e;
    var t;
    d3.json("http://stats.etyd.org/network_info", function (e) { // difficulty
        var data = d3.entries(e);
        d3.select("#difficulty_block").text(d3.format(".6f")(e.difficulty));
        d3.select("#cg_block").text(d3.format(".3s")(e.difficulty*65536));
        d3.select("#network_rate").text(d3.format(".3s")(e.nethashrate) + "H/s");
    });

    d3.json("/local_stats", function (n) {
        d3.select("#peers_in").text(n.peers.incoming);
        d3.select("#peers_out").text(n.peers.outgoing);
        d3.select("#peers_total").text(n.peers.incoming + n.peers.outgoing);
        var r = d3.sum(values(n.miner_hash_rates));
        var i = d3.sum(values(n.miner_dead_hash_rates));
		
		d3.select("#share_hour").text(n.my_share_counts_in_last_hour.unstale_shares);
		d3.select("#share_2hour").text(n.my_share_counts_in_last_hour.unstale_shares2);
		d3.select("#share_4hour").text(n.my_share_counts_in_last_hour.unstale_shares4);
		d3.select("#share_12hour").text(n.my_share_counts_in_last_hour.unstale_shares12);
		
		d3.select("#share_hour_stale").text(n.my_share_counts_in_last_hour.stale_shares);
        d3.select("#local_rate").text(d3.format(".3s")(r) + "H/s");
        d3.select("#local_stale").text(d3.format(".2p")((n.shares.orphan + n.shares.dead) / n.shares.total));
        d3.select("#shares_total").text(n.shares.total);
        d3.select("#shares_orphan").text(n.shares.orphan);
        d3.select("#shares_dead").text(n.shares.dead);
		d3.select("#goodshares").text(n.shares.total - n.shares.orphan - n.shares.dead);
        d3.select("#efficiency").text(n.efficiency != null ? d3.format(".4p")(n.efficiency) : "???");
        d3.select("#uptime_days").text(d3.format(".3f")(n.uptime / 60 / 60 / 24));
        d3.select("#block_value").text(d3.format(".3r")(n.block_value));
        var s = n.attempts_to_share / r;
        d3.select("#time_to_share").text(d3.format(".3r")(s / 60 ) + " Miniutes");
        var o = [];
        for (var u in n.miner_hash_rates) o.push(u);
        d3.select("#local_users").text(o.length);
        var a = n.miner_hash_rates[trackerAddress];
        d3.select("#tracker_rate").text(d3.format(".3s")(a ? a : 0) + "H/s");
        var f = n.miner_dead_hash_rates[trackerAddress];
        d3.select("#tracker_stale").text(d3.format(".3p")(f && a ? f / a : 0));
        d3.select("#tracker_effective").text(d3.format(".3s")(a && f ? a - f : a ? a : 0) + "H/s");
        d3.select("#suggested_local").text("+" + d3.format(".8f")(calcDiff(a ? a : 0)));
        d3.json("/global_stats", function (s) {
            d3.select("#pool_rate").text(d3.format(".3s")(s.pool_hash_rate) + "H/s");
            d3.select("#pool_stale").text(d3.format(".2p")(s.pool_stale_prop));
            d3.select("#difficulty_share").text(d3.format(".6f")(s.min_difficulty));
            d3.select("#cg_share").text(d3.format(".3s")(s.min_difficulty*65536));
            d3.select("#difficulty_worker").text(d3.format(".6f")("0.00048828125"));
            d3.select("#cg_worker").text(d3.format(".3s")(.00048828125 * Math.pow(2, 16)));
            d3.select("#p_node_pool").text(d3.format(".3p")(r / s.pool_hash_rate));
            d3.select("#p_pool_ltc").text(d3.format(".3p")(s.pool_hash_rate / t));
            e = n.attempts_to_block / s.pool_hash_rate;
            d3.select("#time_to_block").text(d3.format(".3r")(e / 3600) + " hours");
            var u = n.miner_hash_rates[trackerAddress] / s.pool_hash_rate * n.block_value * (1 - n.donation_proportion);
            d3.select("#tracker_payout_block_day").text(d3.format(".3r")(u ? u : 0));
            d3.select("#tracker_payout_total_day").text(d3.format(".3r")(24 / (e / 3600) * (u ? u : 0)));
            d3.json("/current_payouts", function (e) {
                d3.json("/payout_addr", function (t) {
                    d3.select("#tracker_payout_block_now").text(trackerAddress in e ? e[trackerAddress] : 0)
					d3.select("#PayoutNOW").text( t in e ? e[t] : 0); 
					
				//	d3.select('#payout_amount').text(addr in pays ? pays[addr] : 0);
					
                });
                var t = [];
                for (var s in e) {
                    t.push(s)
                }
                o.sort(function (e, t) {
                    return n.miner_hash_rates[t] - n.miner_hash_rates[e]
                });
                d3.select("#p2pool_users").text(t.length);
                d3.selectAll("#payout").remove();
                var u = d3.select("#payouts tbody").selectAll().data(o).enter().append("tr").attr("id", "payout");
                u.append("td").append("a").attr("class", "address_column").text(function (e) {
                    return e
                }).attr("href", function (e) {
                    return explorer_prefix + "/address/" + e
                });
                u.append("td").text(function (e) {
                    return d3.format(".3s")(n.miner_hash_rates[e]) + "H/s"
                });
                u.append("td").text(function (e) {
                    return d3.format(".3p")((n.miner_dead_hash_rates[e] || 0) / n.miner_hash_rates[e])
                });
                u.append("td").text(function (n) {
                    return t.indexOf(n) > -1 ? e[n] : "-"
                });
                var a = d3.select("#payouts").append("tr").attr("id", "payout");
                a.append("td").append("strong").text("Total");
                a.append("td").append("i").text(d3.format(".3s")(r) + "H/s");
                a.append("td").text(d3.format(".3p")(i / r));
                a.append("td").append("i").text(d3.sum(t, function (t) {
                    return o.indexOf(t) > -1 ? e[t] : 0
                }).toFixed(8))
            });
			d3.json("http://stats.etyd.org/recent_blockvalues", function (t) {
                d3.selectAll("#block").remove();
                var n = 0;

                d3.select("#luck_actual").text(d3.format(".3r")(t.length));
                d3.select("#luck_expected").text(d3.format(".3r")(86400 / e));
                d3.select("#luck_day").text(d3.format(".3f")(1/(86400 / e / t.length)));
                var r = (Date.now() / 1e3 - t[0].ts) / 3600;
                d3.select("#luck_current").text(d3.format(".3f")(r) + " hours");
                d3.select("#luck_block").text(d3.format(".3f")(1/(r / (e / 3600))));
                var i = d3.select("#blocks tbody").selectAll().data(t).enter().append("tr").attr("id", "block");
                i.append("td").append("a").text(function (e) {
                    return e.number;
                }).attr("href", function (e) {
                    return explorer_prefix + "/block/" + e.hash
                });
                i.append("td").text(function (e) {
                    return (new Date(1e3 * e.ts)).toUTCString()
                });
                i.append("td").text(function (r) {
                    n++;
                    return d3.format(".3r")(1/((parseFloat((r.ts - (n < t.length ? t[n].ts : r.ts)) / 3600 / (e / 3600) * 100).toFixed(1))/100));
                });
                i.append("td").text(function (e) {
                    return d3.format(".5r")(isNaN(e.value) ? 0 : e.value)
                })
            })
        })
    })
    
    plot_later(d3.select("#main-local"), "H/s", "H", 
                [
                    {"url": "/web/graph_data/local_hash_rate/last_" + (period != '' ? period : 'day'), "color": "#0000FF", "label": "Total"},
                    {"url": "/web/graph_data/local_dead_hash_rate/last_" + (period != '' ? period : 'day'), "color": "#FF0000", "label": "Dead"}
                ],1000,300);
}

var trackerAddress = localStorage.vtcTrackerAddress;
var explorer_prefix = "http://explorer.vertcoin.org";
var block_values = [];
if (typeof trackerAddress === "undefined") {
    trackerAddress = "Your Address"
}

function ChangeCurrentPeriod(p_Period, p_Sender)
{
    period=p_Period;
    updateStats();
    $('#scale_menu li').removeClass('active');
    $('#' + p_Sender).addClass('active');
}

$(document).ready(function(){
    $("[rel=tooltip]").tooltip({ placement: 'right'});
});
     
