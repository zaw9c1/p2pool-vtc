    $(document).ready(function() {
      $(document).trigger('init');
    });

    // array defining my addresses for highlighting them

    var myself= [ ];

    var currency, currency_info, rate, local_stats,
        global_stats, current_payouts, recent_blocks;
    var local_hashrate= 0, local_doa_hashrate= 0;

    // ==================================================================
    // event handlers

    $('#hour.hashrate').click(function(e) {
      fetchGraph('hour');
    });
    $('#day.hashrate').click(function(e) {
      fetchGraph('day');
    });
    $('#week.hashrate').click(function(e) {
      fetchGraph('week');
    });
    $('#month.hashrate').click(function(e) {
      fetchGraph('month');
    });
    $('#year.hashrate').click(function(e) {
      fetchGraph('year');
    });

    // ==================================================================
    // custom event handlers

    // init

    $(document).on('init', function(e, eventInfo) {
      fetchdata(); fetchBlocks(); fetchGraph('day');
    });

    $(document).on('update', function(e, eventInfo) {
      fetchdata();
    });

    // Fills the list of active miners on this node.  I know, there are
    // zillions of people out there on p2pool.  But I'm typically only
    // interested to see, who is mining on my node.

    $(document).on('update_miners', function(e, eventInfo) {
      local_hashrate= 0; local_doa_hashrate= 0;
      $.each(local_stats.miner_hash_rates, function(address, hashrate) {
        tr= $('<tr/>').attr('id', address);

        // highlight our miner if configured
        if(myself && myself.length > 0 && $.inArray(address, myself) >= 0) {
          tr.addClass('warning');
        }

        link_icon= $('<i/>').attr('class', 'fa fa-external-link fa-fw');
        blockinfo= $('<a/>')
          .attr('href', currency_info.address_explorer_url_prefix + address)
          .attr('target', '_blank').append(link_icon);

        doa= local_stats.miner_dead_hash_rates[address];
        doa_prop= (parseFloat(doa) / parseFloat(hashrate)) * 100;

        local_hashrate+= hashrate;
        local_doa_hashrate+= doa;

        tr.append($('<td/>').attr('class', 'text-left')
          .html(address + '&nbsp;').append(blockinfo));
        tr.append($('<td/>').attr('class', 'text-right')
          .append(formatHashrate(hashrate)));
        tr.append($('<td/>').attr('class', 'text-right')
          .append(formatHashrate(doa)));
        tr.append($('<td/>').attr('class', 'text-right')
          .append(doa_prop.toFixed(2) + '%'));

        payout= current_payouts[address];

        if(payout) {
          td= $('<td/>').attr('class', 'text-right')
            .text(parseFloat(payout).toFixed(8))
            .append(' ').append(currency.clone());
          tr.append(td);
        }
        else {
          tr.append($('<td/>').attr('class', 'text-right')
            .append($('<i/>').append('no shares yet')));
        }
        $('#'+address).remove(); $('#active_miners').append(tr);
      });

      rate= formatHashrate(local_hashrate)
        + ' (DOA '
        + formatHashrate(local_doa_hashrate)
        + ' / ' + ((local_doa_hashrate / local_hashrate) * 100).toFixed(2)
        + '%)';
      $('#local_rate').text(rate);

      global_doa_rate= global_stats.pool_hash_rate - global_stats.pool_nonstale_hash_rate;
      global_rate= formatHashrate(global_stats.pool_hash_rate)
        + ' (DOA '
        + formatHashrate(global_doa_rate)
        + ' / ' + ((global_doa_rate / global_stats.pool_hash_rate) * 100).toFixed(2)
        + '%)';
      $('#global_rate').text(global_rate);

      $('#share_difficulty')
        .text(parseFloat(global_stats.min_difficulty).toFixed(2));

      $('#block_value')
        .text(parseFloat(local_stats.block_value).toFixed(8))
        .append(' ').append(currency.clone());

      $('#node_donation')
        .text(local_stats.donation_proportion + '%');
      $('#node_fee')
        .text(local_stats.fee + '%');
      $('#p2pool_version')
        .text(local_stats.version);
      $('#protocol_version')
        .text(local_stats.protocol_version);

      $('#peers_in').text(local_stats.peers.incoming);
      $('#peers_out').text(local_stats.peers.outgoing);

      $('#node_uptime').text(('' + local_stats.uptime).formatSeconds());

      if(local_stats.warnings.length > 0) {
        $('#node_alerts').empty();

        $.each(local_stats.warnings, function(key, warning) {
          $('#node_alerts').append($('<p/>').append(warning));
        });

        $('#node_alerts').fadeIn(1000, function() {
          $(this).removeClass('hidden');
        });
      }
      else {
        if(!$('#node_alerts').hasClass('hidden'))
          $('#node_alerts').fadeOut(1000, function() {
            $(this).addClass('hidden');
          });
      }

      $('#shares')
        .text('Total: ' + local_stats.shares.total
        + ' (Orphan: ' + local_stats.shares.orphan
        + ', Dead: ' + local_stats.shares.dead + ')');

      time_to_share= parseInt(local_stats.attempts_to_share) / parseInt(local_hashrate);
      $('#expected_time_to_share').text((''+time_to_share).formatSeconds());
      time_to_block= parseInt(local_stats.attempts_to_block) / parseInt(global_stats.pool_hash_rate);
      $('#expected_time_to_block').text((''+time_to_block).formatSeconds());

      $('#payout_now').html('&dash;');
    });

    // Fills the recent block table

    $(document).on('update_blocks', function(e, eventInfo) {
      $.each(recent_blocks, function(key, block) {
        ts= block.ts; num= block.number; hash= block.hash;

        // link to blockchain.info for the given hash
        blockinfo= $('<a/>')
          .attr('href', currency_info.block_explorer_url_prefix + hash)
          .attr('target', '_blank').text(hash);

        tr= $('<tr/>').attr('id', num);
        tr.append($('<td/>').append($.format.prettyDate(new Date(ts * 1000))));
        tr.append($('<td/>').append(num));
        tr.append($('<td/>').append(blockinfo));
        tr.append($('<td/>').html('&dash;'));
        $('#recent_blocks').append(tr);
      });
    });

    // Places the currency this node is mining in the page header.  If it's
    // Bitcoin, use the fontawesome BTC icon.

    var set_currency_symbol= true;
    $(document).on('update_currency', function(e, eventInfo) {
      if(currency_info.symbol === 'BTC') {
        // use fontawesome BTC symbol
        currency= $('<i/>').attr('class', 'fa fa-btc fa-fw');
      }
      else { currency= $('<span/>').append(currency_info.symbol); }

      if(set_currency_symbol) {
        $('#currency')
          .append('(').append(currency).append(')');
        set_currency_symbol= false;
      }
    });

    // Updates the 'Updated:' field in page header

    $(document).on('update_time', function(e, eventInfo) {
      dts= $.format.date(new Date(), 'yyyy-MM-dd HH:mm:ss');
      $('#updated').text(dts);
    });

    // ==================================================================

    var fetchdata= function() {
      $.getJSON('/rate', function(data) {
        if(data) rate= data;

        $.getJSON('/web/currency_info', function(data) {
          currency_info= data;
          $(document).trigger('update_currency');

          $.getJSON('/local_stats', function(data) {
            if(data) local_stats= data;

            $.getJSON('/current_payouts', function(data) {
              if(data) current_payouts= data;

              $.getJSON('/global_stats', function(data) {
                if(data) global_stats= data;
                $(document).trigger('update_miners');
                $(document).trigger('update_time');
              });
            });
          });
        });
      });
    };

    var fetchBlocks= function() {
      $.getJSON('/web/currency_info', function(data) {
        currency_info= data;
        $.getJSON('/recent_blocks', function(data) {
          if(data) recent_blocks= data;
          $(document).trigger('update_blocks');
        });
      });
    }

    var fetchGraph= function(interval) {
      console.log(interval);
      var graph_hashrate= [], graph_doa_hashrate= [];

      $.getJSON('/web/graph_data/local_hash_rate/last_' + interval, function(data) {
        $.each(data, function(key, value) {
          el= []; el.push(parseInt(value[0]) * 1000,
            parseFloat(value[1]));
          graph_hashrate.push(el);
        });
        graph_hashrate.sort();
        $.getJSON('/web/graph_data/local_dead_hash_rate/last_' + interval, function(data) {
          $.each(data, function(key, value) {
            el= []; el.push(parseInt(value[0]) * 1000,
              parseFloat(value[1]));
            graph_doa_hashrate.push(el);
          });
          graph_doa_hashrate.sort();
          draw(graph_hashrate, graph_doa_hashrate);
        })
      })
    }

    // Let the GitHub ribbon fade out and be removed after 5 seconds.

    setTimeout(function() {
      $('#ribbon').fadeOut(1000, function() {
        this.remove();
      });
    }, 10 * 1000);

    setInterval(function() {
      $(document).trigger('update');
    }, 10 * 1000);
